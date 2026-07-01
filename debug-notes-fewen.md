# 废文网香色书源转换记录

## 参考资料

本版按以下资料优先级处理：

1. `cloudmantou/xiangseSkill`
   - `README.md`
   - `docs/XBS_JSON_CODING_RULES.md`
   - `skills/global/xbs-booksource-workflow.SKILL.md`
   - `skills/local/xiangse-booksource.SKILL.md`
   - `docs/香色书源开发指南与工作流程.md`
2. 用户提供的源阅读废文规则。
3. 用户描述的长佩参考源要点：登录源在 `httpHeaders` 中提示填写 Cookie，形如 `{"cookie":"你的 cookie 值"}`。

本轮没有成功读取本地 `D:/浏览器下载/🐲长佩文学🔮🍪©️(1).xbs` 原文件，因此没有照搬其私有字段，只采用用户明确给出的 Cookie 写法。

## 香色 2.56.1 格式决策

`xiangseSkill` 明确要求：

- 顶层必须是 `{ "<sourceAlias>": { ...sourceConfig } }`。
- 使用 `sourceName/sourceUrl/sourceType/enable/weight`。
- `sourceType` 必须为 `text`。
- `enable` 用数字 `1/0`。
- `weight` 用整数字符串，例如 `"9999"`。
- 动作必须包含 `actionID/parserID/responseFormatType/requestInfo`。
- 禁止旧源阅读字段：`bookSourceName/bookSourceUrl/bookSourceGroup/httpUserAgent`。
- `requestInfo @js` 使用 `config/params/result`。
- 请求对象用 `POST/httpParams/httpHeaders`，不用 `method/data/headers`。

因此本版没有把源阅读 JSON 原样输出，而是转换为香色结构。

## 源阅读字段映射

| 源阅读字段 | 香色字段 |
| --- | --- |
| `bookSourceName` | `sourceName` |
| `bookSourceUrl` | `sourceUrl` / `host` |
| `ruleSearch` | `searchBook` |
| `ruleBookInfo` | `bookDetail` |
| `ruleToc` | `chapterList` |
| `ruleContent` | `chapterContent` |
| `enabledCookieJar/httpHeaders` | 根级 `httpHeaders` + 每个 `requestInfo` 返回 `config.httpHeaders` |
| `bookSourceComment` | `sourceComment/help` |

## 搜索

源阅读规则：

```json
{
  "bookList": ".SHsectionThree-middle>p",
  "name": "a[1]@text",
  "author": "a[-1]@text",
  "kind": "a[0]@text",
  "bookUrl": "a[1]@href"
}
```

香色使用 XPath：

- `list`: `//div[contains(concat(' ', normalize-space(@class), ' '), ' SHsectionThree-middle ')]/p`
- `bookName/title`: `//a[position()=2]/text()`
- `author`: `//a[last()]/text()`
- `cat`: `//a[position()=1]/text()`
- `detailUrl/url`: `//a[position()=2]/@href`

搜索请求：

```js
config.host + '/search/' + encodeURIComponent(params.keyWord) + '/' + page + '/'
```

## 详情

源阅读规则：

- 作者：`[property=og:novel:author]@content`
- 简介：`[property=og:description]@content`
- 分类：`[property=og:novel:category]@content`
- 状态：`[property=og:novel:status]@content`
- 最新章节：`[property=og:novel:latest_chapter_name]@content`
- 目录：`{{baseUrl}}catalog/`

香色使用 XPath：

- `author`: `//meta[@property='og:novel:author']/@content`
- `desc`: `//meta[@property='og:description']/@content||@js:...`
- `cat`: `//meta[@property='og:novel:category']/@content`
- `status`: `//meta[@property='og:novel:status']/@content`
- `lastChapterTitle`: `//meta[@property='og:novel:latest_chapter_name']/@content`

简介清洗保留源阅读思路：删除 `《书名》是由...一本...书籍。` 类型模板句。

## 目录

源阅读规则：

- 章节列表：`ol a`
- 章节名：`text`
- 章节地址：`href`
- 分页：从 `#end@href` 提取最大页码，生成 `2.html` 到 `n.html`

香色规则：

- `list`: `//ol//a`
- `title`: `//text()`
- `url/detailUrl`: `//@href`

这里按 `xiangseSkill` 的兼容要求使用 `//text()` 和 `//@href`，避免章节标题有值但链接为空。

分页目录没有直接返回数组，而是按 `nextPageUrl` 逐页递进：

1. 从 `//*[@id='end']/@href` 提取最大页码。
2. 从 `params.responseUrl` 判断当前页。
3. 当前页小于最大页时返回下一页 `2.html/3.html/...`。

## 正文解密

源阅读逻辑：

1. 章节 HTML 中匹配 `d("密文", "密钥")`。
2. `MD5(密钥)`。
3. MD5 前 16 位为 AES key。
4. MD5 后 16 位为 AES iv。
5. 使用 `AES/CBC/PKCS5Padding` 解 Base64 密文。

香色实现策略：

- `chapterContent.parserID = "JS"`，希望拿到原始响应字符串。
- `content` 用 `@js:` 解析并解密。
- 依次尝试：
  - `java.md5Encode` + `java.aesBase64DecodeToString`
  - 全局 `md5`
  - `CryptoJS.MD5` + `CryptoJS.AES.decrypt`
- 如果都不存在，返回 TODO 文本，而不是伪装成可用。

待实测：香色 2.56.1 是否支持上述任意 MD5/AES 函数，以及 `content @js` 中 `result` 是否为原始章节 HTML。

## Cookie

根级 `httpHeaders`：

```json
{
  "User-Agent": "Mozilla/5.0 ...",
  "Referer": "https://www.sosadfun.org",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "cookie": "请在这里填写你的废文网 Cookie"
}
```

所有动作的 `requestInfo` 都返回 `httpHeaders: config.httpHeaders`。

正文请求会动态把 `Referer` 覆盖为当前章节 URL。

## 分类 bookWorld

没有抓到可靠官方分类 URL，因此没有编造分类接口。

当前实现是分类搜索入口，复用真实搜索接口：

- 原创：`/search/原创/{page}/`
- 同人：`/search/同人/{page}/`
- BL：`/search/BL/{page}/`
- BG：`/search/BG/{page}/`
- GL：`/search/GL/{page}/`
- 无CP：`/search/无CP/{page}/`
- 连载：`/search/连载/{page}/`
- 完结：`/search/完结/{page}/`

这不是废文官方分类页，只是可用降级。后续如果拿到真实分类页或接口，应替换 `bookWorld`。

## 签到

没有实现签到，原因是没有抓到签到接口。

后续需要提供：

- Request URL
- Request Method
- Headers
- Payload/Form Data
- Response
- 成功、已签到、未登录样例

如果香色支持前置请求，可挂到搜索/目录/正文前触发。如果不支持，就不能后台定时签到，只能在用户打开源时触发。

## 导入前建议检查

使用 `xiangseSkill` 工具：

```bash
python tools/scripts/check_xiangse_schema.py xs-fewen.json
python tools/scripts/xbs_tool.py check-editor -i xs-fewen.json
python tools/scripts/xbs_tool.py json2xbs -i xs-fewen.json -o xs-fewen.packed.xbs
python tools/scripts/xbs_tool.py roundtrip -i xs-fewen.json -p xs-fewen
```

登录站点需要 Cookie，真实模拟可能还需要：

```bash
python tools/scripts/xbs_tool.py simulate-live -i xs-fewen.json --engine auto --webview-timeout 25 --keyword 都市 --report xs-fewen.simulate.json
```
