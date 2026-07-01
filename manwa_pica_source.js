class ManwaPicaSource extends ComicSource {
    name = "漫蛙漫画";
    key = "manwa_manga";
    version = "1.0.0";
    minAppVersion = "4.0.0";
    url = "https://manwa.me/";

    baseUrls = ["https://manwa.me", "https://www.manwa.me", "https://manwafl.cc", "https://www.manwafl.cc"];
    activeBaseUrl = "https://manwa.me";

    headers(extra = {}) {
        return Object.assign({
            "Referer": this.activeBaseUrl + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
        }, extra);
    }

    abs(path) {
        if (!path) return "";
        if (path.startsWith("//")) return "https:" + path;
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        if (path.startsWith("/")) return this.activeBaseUrl + path;
        return this.activeBaseUrl + "/" + path;
    }

    text(el) {
        return el ? el.text.replace(/\s+/g, " ").trim() : "";
    }

    attr(el, names) {
        if (!el) return "";
        let attrs = el.attributes || {};
        for (let name of names) {
            if (attrs[name]) return attrs[name];
        }
        return "";
    }

    imageFrom(el) {
        let img = el ? (el.querySelector("img") || el) : null;
        return this.abs(this.attr(img, ["data-original", "data-src", "data-lazy-src", "src"]));
    }

    titleFrom(a) {
        let title = this.attr(a, ["title", "alt"]);
        if (!title) {
            let img = a.querySelector("img");
            title = this.attr(img, ["alt", "title"]);
        }
        if (!title) title = this.text(a);
        return title.replace(/\s+/g, " ").trim();
    }

    async get(url) {
        let res = await Network.get(url, this.headers());
        if ((res.status || 0) >= 400) throw "HTTP " + res.status + ": " + url;
        return res.body || "";
    }

    async getAny(pathOrUrl) {
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
            this.activeBaseUrl = pathOrUrl.match(/^https?:\/\/[^/]+/)[0];
            return await this.get(pathOrUrl);
        }
        let lastError = "";
        for (let base of this.baseUrls) {
            try {
                this.activeBaseUrl = base;
                return await this.get(base + pathOrUrl);
            } catch (e) {
                lastError = String(e);
            }
        }
        throw lastError || "All domains failed";
    }

    parseComicList(html) {
        let doc = new HtmlDocument(html);
        let seen = {};
        let comics = [];
        for (let a of doc.querySelectorAll("a")) {
            let href = this.attr(a, ["href"]);
            if (!href || !/(comic|book|album|manga|detail|manhua|cartoon|read)/i.test(href)) continue;
            let id = this.abs(href.split("#")[0]);
            if (seen[id]) continue;
            let title = this.titleFrom(a);
            let cover = this.imageFrom(a);
            if (!title) {
                let parentText = this.text(a);
                if (parentText.length > 1 && parentText.length < 80) title = parentText;
            }
            if (!title || title.length < 2) continue;
            seen[id] = true;
            comics.push({ title: title, subTitle: "", cover: cover, id: id, tags: [], description: "" });
        }
        return comics;
    }

    async tryList(paths) {
        let lastError = "";
        for (let path of paths) {
            try {
                let html = await this.getAny(path);
                let comics = this.parseComicList(html);
                if (comics.length > 0) return comics;
            } catch (e) {
                lastError = String(e);
            }
        }
        if (lastError) console.warn(lastError);
        return [];
    }

    explore = [{
        title: "首页",
        type: "multiPageComicList",
        load: async (page) => {
            let paths = page <= 1
                ? ["/", "/comic", "/category", "/manhua"]
                : ["/page/" + page, "/comic/page/" + page, "/category/" + page, "/manhua/page/" + page];
            let comics = await this.tryList(paths);
            return { comics: comics, maxPage: comics.length > 0 ? page + 1 : page };
        }
    }];

    search = {
        optionList: [],
        load: async (keyword, options, page) => {
            let q = encodeURIComponent(keyword);
            let paths = [
                "/search?keyword=" + q + "&page=" + page,
                "/search?keyword=" + q,
                "/search/" + q + "/" + page,
                "/search/" + q,
                "/s/" + q + "/" + page,
                "/s/" + q
            ];
            let comics = await this.tryList(paths);
            return { comics: comics, maxPage: comics.length > 0 ? page + 1 : page };
        }
    };

    comic = {
        matchBriefIdRegex: "https?://[^\\s]+",

        loadInfo: async (id) => {
            let html = await this.getAny(id);
            let doc = new HtmlDocument(html);
            let h1 = doc.querySelector("h1") || doc.querySelector(".title") || doc.querySelector(".comic-title") || doc.querySelector(".book-title");
            let title = this.text(h1);
            if (!title) title = this.text(doc.querySelector("title")).replace(/[-_].*$/, "").trim();
            let cover = this.imageFrom(doc.querySelector(".cover") || doc.querySelector(".detail-cover") || doc.querySelector(".book-cover") || doc.querySelector("body"));
            let descNode = doc.querySelector(".intro") || doc.querySelector(".description") || doc.querySelector(".summary") || doc.querySelector(".content");
            let chapters = {};
            let seen = {};
            for (let a of doc.querySelectorAll("a")) {
                let href = this.attr(a, ["href"]);
                if (!href) continue;
                let epUrl = this.abs(href.split("#")[0]);
                if (epUrl === id || seen[epUrl]) continue;
                let label = this.text(a);
                if (!label || label.length > 80) continue;
                if (!/(chapter|chap|read|episode|ep|\/\d+|话|回|章)/i.test(href + " " + label)) continue;
                seen[epUrl] = true;
                chapters[label] = epUrl;
            }
            if (Object.keys(chapters).length === 0) chapters["开始阅读"] = id;
            return { title: title || "漫蛙漫画", subTitle: "", cover: cover, description: this.text(descNode), tags: {}, chapters: chapters };
        },

        loadEp: async (id, ep) => {
            let pageUrl = ep || id;
            let html = await this.getAny(pageUrl);
            let doc = new HtmlDocument(html);
            let images = [];
            let seen = {};
            for (let img of doc.querySelectorAll("img")) {
                let src = this.abs(this.attr(img, ["data-original", "data-src", "data-lazy-src", "src"]));
                if (!src || seen[src]) continue;
                if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(src)) continue;
                if (/(logo|avatar|icon|loading|blank)/i.test(src)) continue;
                seen[src] = true;
                images.push(src);
            }
            return { images: images };
        },

        onImageLoad: (imageKey, comicId, epId) => {
            return { url: imageKey, method: "GET", headers: this.headers({ "Referer": epId || comicId || this.activeBaseUrl + "/" }) };
        },

        onThumbnailLoad: (imageKey) => {
            return { url: imageKey, method: "GET", headers: this.headers() };
        }
    };
}
