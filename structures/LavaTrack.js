export default class LavaTrack {
    /**
     * @param {Object} data Data found by the LavaLink REST APi
     */
    constructor(data) {
        Object.assign(this, {
            author: data.author,
            info: data.info,
            track: data.track
        });
    }

    get author() {
        return this.info.author;
    }

    get full_author() {
        return this.author;
    }

    get title() {
        return this.info.title;
    }

    isSeekable() {
        return this.info.isSeekable;
    }
}
