export default class LavaTrack {
    /**
     * @param {Object} data Data found by the LavaLink REST APi
     */
    constructor(data) {
        Object.assign(this, {
            _author: data.author,
            _info: data.info,
            track: data.track
        });
    }

    get author() {
        return this._info.author;
    }

    get full_author() {
        return this._author;
    }

    get title() {
        return this._info.title;
    }

    isSeekable() {
        return this._info.isSeekable;
    }
}
