/**
 * The amount of time we should attempt to search for a match.
 */
const retries = 10;

export default class ResolvableTrack {
    /**
     * If the track has failed to be matched with a YouTube song/video.
     * @type {boolean}
     */
    broken = false;
    /**
     * Internal counter of how many attempts have been made to match the track.
     * @type {number}
     */
    _attempt = 0;
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

    /**
     * Check if the track has been cached/matched with a YouTube song/video.
     */
    cached() {
        if (!this._cached && !this._caching) return false;
        if (this._cached) return true;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve(false);

                this._call = null;
            }, 2e4);

            this._call = () => {
                resolve(true);

                clearTimeout(timeout);
            };
        });
    }

    /**
     * Do not override this method
     * Tries to match a YouTube song/video with the author/title getters from above.
     * @returns {Promise<boolean>} False if no match, true otherwise.
     */
    async getYouTubeEquiv() {
        if (this._cached) return true;
        if (this._caching) return this.cached();

        this._caching = true;

        const searchId = await this._searchYouTube();
        if (!searchId) {
            this.broken = true;

            return false;
        }

        const track = await this._resolve(searchId);
        if (!track) {
            this.broken = true;

            return false;
        }

        this._track = track;

        this._cached = true;

        if (typeof this._call === 'function') this._call();
        this._call = null;

        return true;
    }

    /**
     * @private
     * @param {string}
     */
    async _resolve(youtubeId) {
        let data;

        do {
            data = await this._m.modules.lavalink.conn.getNode().rest.resolve('https://youtu.be/'+ youtubeId);
        } while (this._attempt++ < retries && (!data || data === true || data.tracks.length === 0));

        this._attempt = 0;

        if (!data || data === true || data.tracks[0].track == true) return false;
        return data.tracks[0].track;
    }

    /**
     * @private
     */
    async _searchYouTube() {
        let search;
        do {
            search = await this._m.modules.api.youtube.search(this.title);
        } while (this._attempt++ < retries && (!search || search.length == 0 || !search[0].id || typeof search !== 'object'));

        this._attempt = 0;

        if (!search || search.length == 0 || !search[0].id || typeof search !== 'object') {
            this.broken = true;

            return false;
        }
        return search[0].id;
    }
}
