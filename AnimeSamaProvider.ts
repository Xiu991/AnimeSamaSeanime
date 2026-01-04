/// <reference path="./_external/.onlinestream-provider.d.ts" />
/// <reference path="./_external/core.d.ts" />

// ===================================================================
// Extension Anime-Sama pour Seanime - ULTRA FIABLE
// ===================================================================
// Site #1 en France - 37M visites/mois
// Code basé sur : Document 3 (Anime-Sama fonctionnel)
// Structure : Anicrush (robuste)
// Auteur : Xiu991
// ===================================================================

const DevMode = true;
const originalConsoleLog = console.log;
console.log = function (...args: any[]) {
    if (DevMode) {
        originalConsoleLog.apply(console, args);
    }
};

class Provider {

    readonly SEARCH_URL = "https://anime-sama.tv/template-php/defaut/fetch.php";
    readonly SEANIME_API = "http://127.0.0.1:43211/api/v1/proxy?url=";
    
    _Server = "";

    getSettings(): Settings {
        return {
            episodeServers: [
                "vidmoly", "sendvid", "sibnet", "vidcdn", "mystream", 
                "streamtape", "uqload", "cdnt2", "vip", "vid", "vidfast"
            ],
            supportsDub: true,
        };
    }

    async search(opts: SearchOptions): Promise<SearchResult[]> {
        let tempquery = opts.query;
        console.log(`🔍 Recherche Anime-Sama: "${tempquery}"`);

        const queryEnglish = opts.media.englishTitle || opts.query;
        const seasonMatch = queryEnglish.toLowerCase().match(/season\s*(\d+)/i);
        const seasonMatch2 = queryEnglish.toLowerCase().match(/(\d+)/);

        let seasonNumberOpts;
        if (seasonMatch) {
            seasonNumberOpts = parseInt(seasonMatch[1], 10);
            console.log(`📝 Saison détectée: ${seasonNumberOpts}`);
        }

        let partNumberOpts;
        const partMatch = queryEnglish.toLowerCase().match(/part\s*(\d+)/i);
        if (partMatch) {
            partNumberOpts = parseInt(partMatch[1], 10);
            console.log(`📝 Partie détectée: ${partNumberOpts}`);
        } else {
            seasonNumberOpts = seasonMatch2 ? parseInt(seasonMatch2[1], 10) : opts.media.format === "TV" ? 1 : -1;
        }

        while (tempquery !== "") {
            console.log(`🔎 Tentative avec: "${tempquery}"`);
            
            const body = new URLSearchParams({ query: tempquery });
            
            try {
                const html = await fetch(
                    this.SEARCH_URL,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body
                    }
                ).then(async res => await res.text());
                
                const $ = await LoadDoc(html);
                const movies = $(".asn-search-result");
                
                console.log(`📺 Résultats trouvés: ${movies.length()}`);
                
                if (movies.length() <= 0) {
                    tempquery = tempquery.split(/[\s:']+/).slice(0, -1).join(" ");
                    console.log(`⚠️ Aucun résultat, réessai avec: "${tempquery}"`);
                    continue;
                }

                let movieUrl: string;
                if (movies.map((i, el) => el.find("h3")).length > 1) {
                    console.log(`🎯 Plusieurs résultats, prendre le premier`);
                    movieUrl = movies.attr("href") || "";
                } else {
                    movieUrl = movies.attr("href") || "";
                }

                console.log(`✅ URL anime trouvée: ${movieUrl}`);
               
                const html2 = await fetch(movieUrl).then(res => res.text());
                let animesJson: { Title: string; Url: string }[] = [];
                
                const Regex = /panneauAnime\("([^"]+)", "([^"]+)"\);/g;
                let match;
                
                while (match = Regex.exec(await LoadDoc(html2)(".flex.flex-wrap.overflow-y-hidden.justify-start.bg-slate-900.bg-opacity-70.rounded.mt-2.h-auto").text())) {
                    const animeTitle = match[1];
                    const animeUrl = match[2];

                    if (animeTitle === "nom" || animeUrl === "url") {
                        continue;
                    }
                    if (opts.media.format !== "Special" && animeUrl.includes("oav/") === true) {
                        continue;
                    }
                    if (opts.media.format !== "MOVIE" && animeUrl.includes("film/") === true) {
                        continue;
                    }
                    if (animeTitle.includes("Kai -") === true) {
                        continue;
                    }
                    if (animeTitle.includes("Sans Fillers") === true) {
                        continue;
                    }
                    
                    const regex = partNumberOpts ? new RegExp(`saison${seasonNumberOpts || 1}-${partNumberOpts}(?!\\d)`) : new RegExp(`saison${seasonNumberOpts}(?!\\d)`);
                    if (seasonNumberOpts !== -1 && !animeUrl.match(regex)) {
                        continue;
                    }
                    if ((opts.media.format !== "Special" && opts.media.format !== "TV" && opts.media.format !== "ONA" && opts.media.format !== "OVA") && animeUrl.includes("saison") === true) {
                        continue;
                    }
                    
                    console.log(`✨ Anime valide: ${animeTitle}`);
                    animesJson.push({
                        Title: animeTitle,
                        Url: animeUrl
                    });
                }

                let BestAnimeTitle = animesJson.length > 1 ? this.findBestTitle(animesJson, opts.media.englishTitle || opts.query) : animesJson[0];
                
                if (!BestAnimeTitle) {
                    BestAnimeTitle = animesJson.find(anime => anime.Title.includes("Saison"));
                }

                if (BestAnimeTitle === undefined) {
                    console.log(`❌ Aucun anime correspondant trouvé`);
                    return [];
                }

                let finalUrl = opts.dub ? movieUrl + "/" + BestAnimeTitle.Url.replace("/vostfr", "/vf") : movieUrl + "/" + BestAnimeTitle.Url;
                
                // Vérifier si l'URL fonctionne
                const vf = await fetch(finalUrl).then(res => res.status);
                const vf1 = await fetch(finalUrl + "1").then(res => res.status);
                
                if (vf !== 200) {
                    if (vf1 === 200) {
                        finalUrl = finalUrl + "1";
                    }
                }

                console.log(`🎉 Anime final: ${BestAnimeTitle.Title}`);
                console.log(`🔗 URL finale: ${finalUrl}`);

                return [{
                    id: finalUrl,
                    title: BestAnimeTitle.Title,
                    url: finalUrl,
                    subOrDub: opts.dub ? "dub" : "sub",
                }];
                
            } catch (error) {
                console.error(`❌ Erreur recherche:`, error);
                tempquery = tempquery.split(/[\s:']+/).slice(0, -1).join(" ");
            }
        }

        console.log(`❌ Aucun résultat après toutes les tentatives`);
        return [];
    }

    async findEpisodes(id: string): Promise<EpisodeDetails[]> {
        console.log(`📺 Récupération épisodes: ${id}`);

        try {
            const $ = await fetch(id).then(res => res.text()).then(LoadDoc);
            
            const fileverScript = $("script[src*='episodes.js?filever']");
            const filever = fileverScript.attr("src");
            
            if (!filever) {
                console.error(`❌ Script episodes.js non trouvé`);
                return [];
            }
            
            console.log(`✅ Script trouvé: ${filever}`);
            
            const episodesText = await fetch(`${id}/${filever}`).then(res => res.text());
            const episodeDetails: EpisodeDetails[] = [];
            let ServerToAdd: string[] = [];
            
            const servers = ["eps1", "eps2", "eps3", "eps4", "eps5", "eps6", "eps7", "eps8"];

            function replaceVidmoly(url: string) {
                return url.replace(/vidmoly\.to/g, 'vidmoly.net');
            }

            servers.forEach(server => {
                const regex = new RegExp(`var\\s+${server}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
                const match = regex.exec(episodesText);
                
                if (match) {
                    const urls = match[1].split(",").map(url => url.trim().replace(/['"]/g, ""));
                    urls.forEach((url, index) => {
                        if (url === "") return;
                        
                        if (url.includes("vidmoly.to")) {
                            url = replaceVidmoly(url);
                        }
                        
                        episodeDetails.push({
                            id: url,
                            url: id,
                            number: index + 1
                        });
                        
                        // Vérifier serveurs manquants
                        if (DevMode) {
                            for (const element of url.trim().replace(/,$/, "").split(",")) {
                                const parts = element.split("/");
                                const PartsServerName = parts[2] ? parts[2].split(".") : [];
                                const serverName = PartsServerName.length >= 3 ? PartsServerName[1] : PartsServerName[0];
                                
                                if (serverName !== undefined && !this.getSettings().episodeServers.includes(serverName) && !ServerToAdd.includes(serverName)) {
                                    ServerToAdd.push(serverName);
                                }
                            }
                        }
                    });
                }
            });

            if (ServerToAdd.length > 0) {
                console.warn(`⚠️ Serveurs manquants: "${ServerToAdd.join(`","`)}"`);}

            const mergedEpisodes = episodeDetails.reduce((acc, curr) => {
                const existing = acc.find(ep => ep.number === curr.number);
                if (existing) {
                    existing.id += `,${curr.id}`;
                } else {
                    acc.push(curr);
                }
                return acc;
            }, <EpisodeDetails[]>[]);

            console.log(`✅ ${mergedEpisodes.length} épisodes trouvés`);
            return mergedEpisodes;
            
        } catch (error) {
            console.error(`❌ Erreur episodes:`, error);
            return [];
        }
    }

    async findEpisodeServer(episode: EpisodeDetails, _server: string): Promise<EpisodeServer> {
        this._Server = _server;
        console.log(`🎬 Episode ${episode.number} - Serveur: ${_server}`);
        
        const servers = episode.id.split(",");
        const serverUrl = servers.find(server => server.includes(_server));
        const videoSources: VideoSource[] = [];
        
        if (serverUrl && _server !== "") {
            console.log(`✅ Serveur trouvé: ${serverUrl.substring(0, 50)}...`);
            
            try {
                const result = await this.HandleServerUrl(serverUrl);
                if (Array.isArray(result)) {
                    videoSources.push(...result);
                } else {
                    videoSources.push(result);
                }
            } catch (error) {
                console.error(`❌ Erreur extraction vidéo:`, error);
            }
        } else {
            console.log(`❌ Serveur ${_server} non trouvé`);
            console.log(`💡 Serveurs disponibles: ${servers.map(url => {
                const parts = url.split("/");
                const partsServerName = parts[2] ? parts[2].split(".") : [];
                return partsServerName.length >= 3 ? partsServerName[1] : partsServerName[0];
            }).join(", ")}`);
            
            return {
                headers: {},
                server: "",
                videoSources: []
            };
        }

        if (videoSources.length > 0) {
            const ref = serverUrl!.split("/").slice(0, 3).join("/");
            console.log(`🎉 ${videoSources.length} source(s) vidéo`);
            
            return {
                headers: { referer: ref },
                server: _server,
                videoSources: videoSources
            };
        } else {
            console.warn(`⚠️ Aucune source vidéo`);
            return {
                headers: {},
                server: _server + " (video not found)",
                videoSources: [{
                    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
                    type: "m3u8",
                    quality: "video not found",
                    subtitles: []
                }]
            };
        }
    }

    // === Méthodes utilitaires ===

    private findBestTitle(movies: { Title: string; Url: string }[], query: string): { Title: string; Url: string } | undefined {
        let bestScore = 0;
        let bestMovie: { Title: string; Url: string } | undefined;

        for (const movie of movies) {
            const score = this.scoreStringMatch(2, movie.Title, query);
            console.log(`📊 "${movie.Title}" = ${score.toFixed(2)}`);

            if (score > bestScore) {
                bestScore = score;
                bestMovie = movie;
            }
        }

        if (bestMovie) {
            console.log(`🏆 Meilleur: ${bestMovie.Title}`);
            return bestMovie;
        }
        return undefined;
    }

    private scoreStringMatch(weight: number, text: string | undefined, query: string | undefined): number {
        if (!text || !query) return 0;

        text = text.toLowerCase();
        query = query.toLowerCase();

        if (text === query) return 10 * weight;

        const textWords = text.split(" ");
        const queryWords = query.split(" ");
        let score = 0;

        for (const word of queryWords) {
            if (textWords.includes(word)) {
                score += 10 / textWords.length;
            }
        }

        return score * weight;
    }

    private async HandleServerUrl(serverUrl: string): Promise<VideoSource[] | VideoSource> {
        console.log(`🔍 Analyse serveur: ${serverUrl.substring(0, 50)}...`);
        
        try {
            const req = await fetch(`${this.SEANIME_API}${encodeURIComponent(serverUrl)}`);
            if (!req.ok) {
                console.error(`❌ HTTP ${req.status}`);
                return [];
            }

            const html = await req.text();

            // Unpacker si nécessaire (Dean Edwards' Packer)
            let unpacked: string | undefined;
            if (html.includes("eval(function(p,a,c,k,e,d)")) {
                console.log(`🔓 Unpacking...`);
                unpacked = this.unpackScript(html);
            }

            // Chercher résolution
            const resolutionMatch = html.match(/(\d{3,4})p(?=[" ])/) || unpacked?.match(/(\d{3,4})p(?=[" ])/);
            if (resolutionMatch) {
                console.log(`📺 Résolution: ${resolutionMatch[1]}p`);
            }

            // M3U8
            const m3u8Videos = await this.findMediaUrls("m3u8", html, serverUrl, resolutionMatch, unpacked);
            if (m3u8Videos !== undefined) {
                console.log(`✅ M3U8 trouvé`);
                return m3u8Videos;
            }

            // MP4
            const mp4Videos = await this.findMediaUrls("mp4", html, serverUrl, resolutionMatch, unpacked);
            if (mp4Videos !== undefined) {
                console.log(`✅ MP4 trouvé`);
                return mp4Videos;
            }

            console.warn(`⚠️ Aucune vidéo trouvée`);
            return [];
            
        } catch (error) {
            console.error(`❌ Erreur:`, error);
            return [];
        }
    }

    private async findMediaUrls(
        type: VideoSourceType,
        html: string,
        serverUrl: string,
        resolutionMatch?: RegExpMatchArray | null,
        unpacked?: string
    ): Promise<VideoSource[] | VideoSource | undefined> {
        
        const regex = new RegExp('https?:\\/\\/[^\'"]+\\.' + type + '(?:\\?[^\\s\'"]*)?(?:#[^\\s\'"]*)?', 'g');
        
        let VideoMatch = html.match(regex) ||
                        unpacked?.match(regex) ||
                        html.match(new RegExp(`"([^"]+\\.${type})"`, "g")) ||
                        unpacked?.match(new RegExp(`"([^"]+\\.${type})"`, "g"));

        if (VideoMatch) {
            if (!VideoMatch.some(url => url.startsWith("http"))) {
                const serverurldomain = serverUrl.split("/").slice(0, 3).join("/");
                VideoMatch = VideoMatch.map(url => `${serverurldomain}${url}`.replaceAll(`"`, ""));
            }

            if (VideoMatch[0].includes(`master.${type}`)) {
                const ref = serverUrl.split("/").slice(0, 3).join("/");
                const req = await fetch(`${this.SEANIME_API}${encodeURIComponent(VideoMatch[0])}`);
                let reqHtml = await req.text();
                reqHtml = decodeURIComponent(reqHtml);
                
                let qual = "";
                let url = "";
                const videos: VideoSource[] = [];
                
                if (reqHtml.includes("#EXTM3U")) {
                    reqHtml.split("\n").forEach(line => {
                        if (line.startsWith("#EXT-X-STREAM-INF")) {
                            qual = line.split("RESOLUTION=")[1]?.split(",")[0] || "unknown";
                            const height = parseInt(qual.split("x")[1]) || 0;

                            if (height >= 1080) qual = "1080p";
                            else if (height >= 720) qual = "720p";
                            else if (height >= 480) qual = "480p";
                            else if (height >= 360) qual = "360p";
                            else qual = "unknown";
                        }
                        else if (line.startsWith("/api/v1/proxy?url=http")) {
                            url = line.replace("/api/v1/proxy?url=", "");
                        }

                        if (url && qual) {
                            videos.push({
                                url: url,
                                type: type,
                                quality: `${this._Server} - ${qual}`,
                                subtitles: []
                            });
                            url = "";
                            qual = "";
                        }
                    });
                }

                if (videos.length > 0) {
                    return videos.sort((a, b) => {
                        const resolutionOrder = ["1080p", "720p", "480p", "360p", "unknown"];
                        const aIndex = resolutionOrder.indexOf(a.quality.split(" ")[2]);
                        const bIndex = resolutionOrder.indexOf(b.quality.split(" ")[2]);
                        return aIndex - bIndex;
                    });
                }
            }

            return {
                url: VideoMatch[0],
                quality: resolutionMatch ? resolutionMatch[1] : `${this._Server} - unknown`,
                type: type,
                subtitles: []
            };
        }

        return undefined;
    }

    private unpackScript(html: string): string {
        function unpack(p: string, a: number, c: number, k: string[]) {
            while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
            return p;
        }

        const fullRegex = /eval\(function\([^)]*\)\{[\s\S]*?\}\(\s*'([\s\S]*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]*?)'\.split\('\|'\)/;
        const match = html.match(fullRegex);

        if (match) {
            const packed = match[1];
            const base = parseInt(match[2], 10);
            const count = parseInt(match[3], 10);
            const dict = match[4].split('|');

            return unpack(packed, base, count, dict)
                .replace(/\\u([\d\w]{4})/gi, (_, grp) => String.fromCharCode(parseInt(grp, 16)))
                .replace(/%3C/g, '<').replace(/%3E/g, '>')
                .replace(/%3F/g, '?').replace(/%3A/g, ':')
                .replace(/%2C/g, ',').replace(/%2F/g, '/')
                .replace(/%2B/g, '+').replace(/%20/g, ' ')
                .replace(/%21/g, '!').replace(/%22/g, '"')
                .replace(/%27/g, "'").replace(/%28/g, '(')
                .replace(/%29/g, ')').replace(/%3B/g, ';');
        }

        return "";
    }
}
