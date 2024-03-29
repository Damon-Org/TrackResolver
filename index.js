import BaseModule from './structures/BaseModule.js'
import LavaTrack from './structures/LavaTrack.js'
import ResolvableTrack from './structures/ResolvableTrack.js'

export default class TrackResolver extends BaseModule {
    _cache = new Map();

    /**
     * @param {Main} main
     */
    constructor(main) {
        super(main);

        this.register(TrackResolver, {
            name: 'trackResolver',
            requires: ['lavalink']
        });

        Object.assign(this, { ResolvableTrack });
    }

    /**
     * The default resolve function, resolves through LavaLink
     * @private
     * @param {URL} url
     */
    async _resolve(url) {
        const data = await this.modules.lavalink.conn.getNode().rest.resolve(url.toString());

        if (!data) return { data };

        if (data.type === 'PLAYLIST') {
            const tracks = [];

            data.tracks.forEach((track) => tracks.push(new LavaTrack(track)));

            this._m.emit('playlistPlayed');

            return { type: 'playlist', data: tracks };
        }
        return { type: 'song', data: new LavaTrack(data.tracks[0])};
    }

    /**
     * Checks if the arguments given are valid inputs to be resolved to a Track
     * @param {string[]} args
     */
    isValidResolvable(args) {
        if (args.length > 1) return false;

        try {
            new URL(args[0]);

            return true;
        }
        catch (e) {
            return false;
        }
    }

    /**
     * @param {string} moduleName The modulename of the resolver
     * @param {string[]} hostnames The supported hostnames this resolver will handle
     */
    registerResolver(moduleName, hostnames) {
        const module = this.modules[moduleName];

        for (const host of hostnames) {
            this._cache.set(host, module);
        }
    }

    /**
     * @param {string} url
     * @returns {Promise<TrackObject|*>}
     */
    resolve(url) {
        const urlInstance = new URL(url);

        const resolver = this._cache.get(urlInstance.hostname);
        if (resolver) {
            return resolver.resolve(urlInstance);
        }

        return this._resolve(urlInstance);
    }
}
