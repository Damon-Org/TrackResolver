import stringSimilarity from 'string-similarity'

export default class ResolvableTrack {
    /**
     * If the track has failed to be matched with a YouTube song/video.
     * @type {boolean}
     */
    broken = false;
    /**
     * If the track is busy caching at the moment
     * @type {boolean}
     */
    _caching = false;
    /**
     * If the track has been cached previously.
     * @type {boolean}
     */
    _cached = false;
    /**
     * Preallocate the memory for the variable
     * @type {Function}
     */
    _call = null;

    /**
     * @type {string}
     */
    _track;

    /**
     * @param {Main} main The main entry point of the bot.
     */
    constructor(main) {
        this._m = main;
    }

    /**
     * General/most important author of the track.
     */
    get author() {
        throw new Error('[ResolvableTrack] "author" getter not implemented');
    }

    /**
     * Can just return this.author or more authors that are less important.
     */
    get full_author() {
        throw new Error('[ResolvableTrack] "full_author" getter not implemented');
    }

    /**
     * The title should be something descriptive enough so that the
     * YouTube API gets the best match.
     */
    get title() {
        throw new Error('[ResolvableTrack] "title" getter not implemented');
    }

    get needsCaching() {
        return true;
    }

    get track() {
        return this._track;
    }

    isSeekable() {
        return true;
    }

    cached() {
        if (!this._cached && !this._caching) return false;
        if (this._cached) return true;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve(false);

                this._call = null;
            }, 2e4);

            this._call = (result) => {
                resolve(result);

                clearTimeout(timeout);
            }
        });
    }

    async getYouTubeEquiv() {
        if (this._cached) return true;
        if (this._caching) return this.cached();

        this._caching = true;

        const results = await this._searchYouTube();

        if (!results) return this._markFailing();

        // Sorts the array directly no need to assign to a new variable
        if (!this._sortResults(results)) return this._markFailing();

        // Loops over the results, break the moment a track works
        this._track = await this._resolve(results);

        if (typeof this._track !== 'string') return this._markFailing();

        this._caching = false;
        this._cached = true;

        if (typeof this._call === 'function') this._call(true);
        this._call = null;

        return true;
    }

    /**
     * @private
     */
    _markFailing() {
        this.broken = true;

        if (typeof this._call === 'function') this._call(false);
        this._call = null;

        return false;
    }

    /**
     * @private
     */
    async _resolve(results) {
        for (const result of results) {
            const data = await this._m.modules.lavalink.conn.getNode().rest.resolve(result.shareLink);

            if (!data || !data instanceof Object || data.tracks.length === 0) continue;

            return data.tracks[0].track;
        }

        return null;
    }

    /**
     * @private
     * @returns {Promise<Object>|null}
     */
    _searchYouTube() {
        return this._m.modules.api.youtube.search(this.title);
    }

    /**
     * This method will loop the array and try and find the best matching track for the search term
     * @private
     * @param {Object} results YouTube search results
     */
    _sortResults(results) {
        if (!results instanceof Array || !results[0].title) return false;

        const titles = [];

        const regex = new RegExp(/(\(( )?)?( )?(?:original|official|music|video|version)(?:\s+(?:original|official|music|video|version))*( )?(( )?\))?/, 'ig');
        results.forEach(
            (result) => titles.push(result.title.replace(regex, ''))
        );

        const matches = stringSimilarity.findBestMatch(this.title, titles);

        results.forEach(
            (result, i) => result.weight = matches.ratings[i].rating + result.channel.verified ? .25 : 0
        );

        results.sort((e1, e2) => e1.weight > e2.weight ? -1 : 1);

        return true;
    }
}
