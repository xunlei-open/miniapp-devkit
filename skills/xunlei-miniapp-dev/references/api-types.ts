// 完整 Manifest 与迅雷 API 类型参考，随 Skill 分发，无需安装依赖即可阅读。
// 对应类型包：@xunlei-open/miniapp-types
// 仅供查阅，不要复制到应用中替代正式类型依赖。

// ─── 微应用清单类型 ──────────────────────────────────────────────

/** 微应用清单，描述应用元数据、入口、权限和扩展能力。 */
export interface MiniappManifest {
	/** 清单格式版本,默认为 1 */
	manifest_version?: 1;
	/** 微应用内部名称，仅用于元数据和展示，不参与微应用 ID 生成。 */
	name: string;
	/** 面向用户展示的微应用名称。 */
	title: string;
	/** 微应用简介，最多 1024 个字符。 */
	description?: string;
	/** 微应用版本：遵循语义化版本规范，例如 "1.0.0" */
	version: string;
	/** 微应用作者。 */
	author?: string;
	/** 项目主页地址。 */
	homepage?: string;
	/** 源代码仓库信息。 */
	repository?: MiniappRepositoryManifest;
	/** 微应用图标，相对于微应用包根目录。 */
	icon?: string;
	/** 页面入口配置。 */
	entry?: MiniappEntryManifest;
	/** 窗口配置。 */
	window?: MiniappWindowOptions;
	/** 申请使用的平台权限。 */
	permissions?: MiniappPermission[];
	/** 网络访问配置。 */
	network?: MiniappNetworkManifest;
	/** 生命周期事件脚本配置。 */
	scripts?: MiniappScriptManifest[];
	/** 用户设置项。 */
	settings?: MiniappSettingManifest[];
}

export type MiniappPermission =
	| "network"
	| "tasks.create"
	| "tasks.list"
	| "tasks.detail"
	| "tasks.file.access"
	| "tasks.update"
	| "tasks.delete"
	| "blob"
	| "webview";

export interface MiniappNetworkManifest {
	[key: string]: unknown;
	/** 页面和事件脚本可直接访问的远程网址匹配模式。 */
	urls?: string[];
}

export type MiniappEntryType = "miniapp" | "in_app_webview";

export interface MiniappEntryManifest {
	/** 默认使用微应用自己的页面容器。 */
	type?: MiniappEntryType;
	/** 微应用页面（miniapp）使用包内相对地址；内嵌网页（in_app_webview）使用完整的 HTTP 或 HTTPS 地址。 */
	url: string;
}

export interface MiniappRepositoryManifest {
	url: string;
	directory?: string;
}

export interface MiniappWindowOptions {
	width?: number;
	height?: number;
}

export interface MiniappScriptManifest {
	event: MiniappLifecycleEventName;
	match?: MiniappEventMatch;
	entry: string;
}

export type MiniappLifecycleEventName =
	| "onResolve"
	| "onStart"
	| "onError"
	| "onDone";

export type MiniappEventMatch = {
	urls?: string[];
	labels?: string[];
};

export type MiniappSettingValue = string | number | boolean;

export interface MiniappSettingManifest {
	name: string;
	title: string;
	description?: string;
	type?: "string" | "number" | "boolean";
	value?: MiniappSettingValue;
	options?: MiniappSettingOption[];
}

export interface MiniappSettingOption {
	label: string;
	value: MiniappSettingValue;
}

// ─── 下载请求、资源与进度类型 ────────────────────────────────────

/** 下载协议类型。 */
export type Protocol = "http" | "bt" | "ed2k";

export type TaskStatus =
	| "ready"
	| "running"
	| "pause"
	| "wait"
	| "error"
	| "done";

/** 支持的 HTTP 请求头 */
export type HttpHeader = {
	"User-Agent"?: string;
	Referer?: string;
	Cookie?: string;
	Authorization?: string;
};

export interface HttpReqExtra {
	header?: HttpHeader;
}

export type ReqExtra = HttpReqExtra;

export interface Request {
	/** 请求地址，支持 HTTP、HTTPS、磁力链接、电驴链接和本地种子文件。 */
	url: string;
	/** 请求的附加选项。 */
	extra?: ReqExtra;
	/** 请求标签，以键值对形式保存。 */
	labels?: { [key: string]: string };
}

export interface ExtensionRequest extends Request {
	/** 全量覆盖任务请求的标签。 */
	setLabels(labels: Record<string, string>): Promise<void>;
	/** 设置任务请求的单个标签。 */
	putLabel(key: string, value: string): Promise<void>;
	/** 删除任务请求的单个标签。 */
	delLabel(key: string): Promise<void>;
}

export interface FileInfo {
	name: string;
	/** 文件相对于资源根目录的路径。 */
	path: string;
	/** 文件大小，单位为字节。 */
	size: number;
}

export interface Resource {
	/** 资源名称；资源为文件夹时，表示文件夹名称。 */
	name: string;
	/** 资源总大小，单位为字节。 */
	size: number;
	/** 资源包含的文件列表。 */
	files: FileInfo[];
}

export interface HttpOptsExtra {
	/** 并发连接数。 */
	connections?: number;
}

export type OptsExtra = HttpOptsExtra;

export interface Options {
	/** 指定保存的文件名。 */
	name?: string;
	/** 指定文件保存路径。 */
	path?: string;
	/** 下载的附加选项。 */
	extra?: OptsExtra;
}

export interface TaskProgress {
	/** 下载已用时间，单位为纳秒。 */
	used: number;
	/** 下载速度，单位为字节每秒。 */
	speed: number;
	/** 已下载大小，单位为字节。 */
	downloaded: number;
}

// ─── 任务类型 ────────────────────────────────────────────────────

export interface Task {
	type: "single";
	/** 任务标识。 */
	id: string;
	/** 下载协议类型。 */
	protocol: Protocol;
	/** 任务展示名称。 */
	name: string;
	/** 任务元数据，包含请求、资源和下载选项。 */
	meta: {
		/** 任务详情不返回请求的附加选项。 */
		req: Omit<Request, "extra">;
		res: Resource;
		/** 任务详情不返回下载的附加选项。 */
		opts: Omit<Options, "extra">;
	};
	/** 任务状态。 */
	status: TaskStatus;
	/** 任务进度。 */
	progress: TaskProgress;
	/** 任务总大小，单位为字节。 */
	size: number;
	/** 任务创建时间，采用 ISO 8601 格式。 */
	createdAt: string;
	/** 任务更新时间，采用 ISO 8601 格式。 */
	updatedAt: string;
}

/** 普通任务与任务组均使用 id 字段标识，通过 type 字段区分类型。 */
export type TaskDetailResult = Task | TaskGroup;

export interface TaskGroup extends Omit<Task, "type" | "protocol" | "meta"> {
	type: "group";
	/** path 为父目录，name 为组目录名。 */
	opts: { path: string; name: string };
	/** 当前仍存在的子任务，不嵌套任务组。 */
	children: Task[];
}

export interface TaskFileAccessInput {
	taskId: string;
	fileIndex: number;
}

export interface TaskFileAccessResult {
	/** 用于只读访问任务文件内容的临时 HTTP 地址。 */
	url: string;
}

/**
 * 扩展任务类型，提供任务控制能力。
 * 用于任务开始（onStart）和任务出错（onError）事件的上下文。
 */
export interface ExtensionTask extends Task {
	meta: Omit<Task["meta"], "req"> & {
		req: ExtensionRequest;
	};
	/** 覆盖任务请求地址。 */
	setUrl(url: string): Promise<void>;
}

export interface OnErrorExtensionTask extends ExtensionTask {
	/** 恢复任务。 */
	continue(): Promise<void>;
}

export interface TaskCreateInput {
	req: Request;
	opts?: Options;
}

/** 创建一组共享下载目录的任务，复用 tasks.create 权限。 */
export interface TaskCreateGroupInput {
	/** 单个目录名，不允许路径分隔符、. 或 ..。 */
	name: string;
	reqs: Request[];
	/** path 为父目录；未指定时使用宿主默认下载目录。 */
	opts?: Options;
}

export interface TaskListInput {
	/** 跳过的任务数量，默认从 0 开始。 */
	offset?: number;
	/** 每页最多返回的任务数量，宿主默认值由运行时约定。 */
	limit?: number;
	/** 按任务状态筛选。 */
	status?: Task["status"] | Task["status"][];
	/** 创建时间排序方式，默认倒序。 */
	sort?: "createdAtAsc" | "createdAtDesc";
}

export interface TaskListResult {
	/** 当前页的任务标识；详情通过 tasks.detail 单独查询。 */
	ids: string[];
	/** 满足筛选条件的任务总数。 */
	total: number;
}

export interface TaskDetailInput {
	id: string;
}

export interface TaskUpdateInput {
	/** 要更新的任务标识。 */
	id: string;
	/** 要更新的请求字段；当前仅支持 labels。 */
	req?: {
		/** 替换任务请求的标签。 */
		labels?: { [key: string]: string };
	};
}

export interface TaskDeleteInput {
	id: string;
	deleteFiles?: boolean;
}

export interface TaskDeleteResult {
	id: string;
	deleted: boolean;
}

// ─── 事件上下文类型 ──────────────────────────────────────────────

/** onResolve 解析结果中的文件必须指定下载请求，其他文件信息可省略。 */
export type OnResolveFileInfo = {
	name?: FileInfo["name"];
	path?: FileInfo["path"];
	size?: FileInfo["size"];
	req: Request;
};

/** 资源解析事件（onResolve）的结果允许省略名称和总大小。 */
export type OnResolveResource = {
	name?: Resource["name"];
	size?: Resource["size"];
	files: OnResolveFileInfo[];
};

/** 资源解析事件（onResolve）的上下文。 */
export interface OnResolveContext {
	/** 用户请求信息（只读）。 */
	req: Request;
	/** 解析结果，由事件脚本填充。 */
	res?: OnResolveResource;
}

/** 任务开始事件（onStart）的上下文。 */
export interface OnStartContext {
	/** 当前任务信息。 */
	task: ExtensionTask;
}

/** 任务出错事件（onError）的上下文。 */
export interface OnErrorContext {
	/** 出错时的任务信息。 */
	task: OnErrorExtensionTask;
	/** 错误详情（只读）。 */
	error: Error;
}

/** 任务完成事件（onDone）的上下文。 */
export interface OnDoneContext {
	/** 完成时的任务信息，只读，不提供修改请求地址或标签等控制方法。 */
	task: Task;
}

// ─── 事件处理函数类型 ────────────────────────────────────────────

export type XunleiOnResolveHandler = (
	ctx: OnResolveContext,
) => Promise<void> | void;

export type XunleiOnStartHandler = (
	ctx: OnStartContext,
) => Promise<void> | void;

export type XunleiOnErrorHandler = (
	ctx: OnErrorContext,
) => Promise<void> | void;

export type XunleiOnDoneHandler = (ctx: OnDoneContext) => Promise<void> | void;

// ─── 平台接口类型 ────────────────────────────────────────────────

/** 微应用信息（只读）。 */
export interface XunleiInfo {
	/** 微应用稳定身份，由本地目录路径或签名公钥派生。 */
	identity: string;
	/** 微应用内部名称，对应清单中的 name 字段。 */
	name: string;
	/** 微应用作者。 */
	author: string;
	/** 微应用展示名称，对应清单中的 title 字段。 */
	title: string;
	/** 微应用版本，对应清单中的 version 字段。 */
	version: string;
}

/** 微应用日志接口。 */
export interface XunleiLogger {
	debug(message?: unknown, ...optionalParams: unknown[]): void;
	info(message?: unknown, ...optionalParams: unknown[]): void;
	warn(message?: unknown, ...optionalParams: unknown[]): void;
	error(message?: unknown, ...optionalParams: unknown[]): void;
}

/** 微应用设置接口。 */
export interface XunleiSettings {
	/** 以清单中各设置项的 name 字段为键，提供对应的设置值。 */
	[key: string]: MiniappSettingValue | undefined;
}

/** 微应用键值对存储接口。 */
export interface XunleiStorage {
	/**
	 * 获取指定键的值，键不存在时返回空字符串。
	 */
	get(key: string): Promise<string>;
	/**
	 * 设置指定键的值，键不存在时创建。
	 */
	set(key: string, value: string): Promise<void>;
	/**
	 * 移除指定键对应的键值对。
	 */
	remove(key: string): Promise<void>;
	/**
	 * 清除所有键值对。
	 */
	clear(): Promise<void>;
	/**
	 * 返回已存储的所有键。
	 */
	keys(): Promise<string[]>;
}

/** 任务管理接口，可用于页面和事件脚本。 */
export interface XunleiTasks {
	/** 创建下载任务。 */
	create(input: TaskCreateInput): Promise<Task>;
	/** 创建共享下载目录的任务组。 */
	createGroup(input: TaskCreateGroupInput): Promise<TaskGroup>;
	/** 按分页和筛选条件查询任务标识列表。 */
	list(input?: TaskListInput): Promise<TaskListResult>;
	/** 查询普通任务或任务组的详情。 */
	detail(input: TaskDetailInput): Promise<TaskDetailResult>;
	/** 更新任务标签；当前仅支持 req.labels。 */
	update(input: TaskUpdateInput): Promise<Task>;
	/** 删除任务，并按参数决定是否删除文件。 */
	delete(input: TaskDeleteInput): Promise<TaskDeleteResult>;
}

export interface XunleiMiniappTasks extends XunleiTasks {
	/** 任务文件访问接口。 */
	file: {
		/** 获取用于只读访问任务文件的临时地址。 */
		access(input: TaskFileAccessInput): Promise<TaskFileAccessResult>;
	};
}

export interface XunleiEvents {
	/** 注册资源解析事件处理函数。 */
	onResolve(handler: XunleiOnResolveHandler): void;
	/** 注册任务开始事件处理函数。 */
	onStart(handler: XunleiOnStartHandler): void;
	/** 注册任务出错事件处理函数。 */
	onError(handler: XunleiOnErrorHandler): void;
	/** 注册任务完成事件处理函数。 */
	onDone(handler: XunleiOnDoneHandler): void;
}

// ─── 内嵌网页类型 ────────────────────────────────────────────────

/** 打开内嵌网页时的窗口配置。 */
export interface WebviewOpenOptions {
	/**
	 * 是否隐藏网页窗口，默认为 false（显示窗口）。
	 * 非本地开发环境中，事件脚本打开的网页窗口会被强制隐藏。
	 */
	headless?: boolean;
	/** 窗口标题。 */
	title?: string;
	/** 窗口宽度。 */
	width?: number;
	/** 窗口高度。 */
	height?: number;
	/** WebView 使用的 User-Agent。 */
	userAgent?: string;
}

export interface WebviewGotoOptions {
	/** 导航超时时间，单位为毫秒。 */
	timeoutMs?: number;
	/** 等待页面加载完成的阶段。 */
	waitUntil?: "load" | "domcontentloaded";
}

export interface WebviewClickOptions {
	/** 点击前等待的时间，单位为毫秒。 */
	delay?: number;
}

export interface WebviewTypeOptions {
	/** 输入字符之间的延迟，单位为毫秒。 */
	delay?: number;
}

export interface WebviewWaitOptions {
	/** 最长等待时间，单位为毫秒。 */
	timeoutMs?: number;
	/** 轮询间隔，单位为毫秒。 */
	pollIntervalMs?: number;
}

export interface WebviewWaitForSelectorOptions extends WebviewWaitOptions {
	/** 只在元素可见时视为匹配。 */
	visible?: boolean;
	/** 只在元素隐藏或不存在时视为匹配。 */
	hidden?: boolean;
}

export interface WebviewCookie {
	/** Cookie 名称。 */
	name: string;
	/** Cookie 值。 */
	value: string;
	/** Cookie 作用域。 */
	domain?: string;
	/** Cookie 路径。 */
	path?: string;
	/** 过期时间，可传日期字符串、Unix 时间戳或 Date。 */
	expires?: string | number | Date;
	/** 是否仅通过 HTTPS 发送。 */
	secure?: boolean;
	/** 是否禁止页面脚本读取。 */
	httpOnly?: boolean;
}

/** 可直接执行的 JavaScript 字符串，或会被序列化到 WebView 中执行的函数。 */
export type WebviewExecutable<T = unknown> =
	| string
	| ((...args: unknown[]) => T | Promise<T>);

export interface WebviewPage {
	/** 在后续导航的页面上下文创建前注入脚本。 */
	addInitScript(script: string): Promise<void>;
	/** 导航到指定网址。 */
	goto(url: string, opts?: WebviewGotoOptions): Promise<void>;
	/** 在 WebView 页面上下文中执行脚本。 */
	execute<T = unknown>(
		scriptOrFn: WebviewExecutable<T>,
		...args: unknown[]
	): Promise<T>;
	/** 聚焦指定元素。 */
	focus(selector: string): Promise<void>;
	/** 点击指定元素。 */
	click(selector: string, opts?: WebviewClickOptions): Promise<void>;
	/** 向指定元素输入文本。 */
	type(
		selector: string,
		text: string,
		opts?: WebviewTypeOptions,
	): Promise<void>;
	/** 等待选择器匹配；超时时返回 false。 */
	waitForSelector(
		selector: string,
		opts?: WebviewWaitForSelectorOptions,
	): Promise<boolean>;
	/** 等待脚本返回真值；超时时返回 null。 */
	waitForFunction<T = unknown>(
		scriptOrFn: WebviewExecutable<T>,
		...args: unknown[]
	): Promise<T | null>;
	/** 读取当前 WebView 的 Cookie。 */
	getCookies(): Promise<WebviewCookie[]>;
	/** 写入一个 Cookie。 */
	setCookie(cookie: WebviewCookie): Promise<void>;
	/** 删除一个 Cookie。 */
	deleteCookie(cookie: WebviewCookie): Promise<void>;
	/** 清空当前 WebView session 的 Cookie。 */
	clearCookies(): Promise<void>;
	/** 返回当前页面地址。 */
	url(): Promise<string>;
	/** 返回当前页面的 HTML。 */
	content(): Promise<string>;
	/** 关闭当前 WebView 页面。 */
	close(): Promise<void>;
}

export interface XunleiRuntimeWebview {
	/** 检查内嵌网页能力是否可用。 */
	isAvailable(): Promise<boolean>;
	/**
	 * 打开内嵌网页并返回页面操作接口。
	 *
	 * WebView 页面不会注入 `xunlei`，页面操作应通过返回的 `WebviewPage` 完成。
	 *
	 * @example
	 * ```ts
	 * if (!(await xunlei.runtime.webview.isAvailable())) {
	 *   throw new Error("当前宿主不支持 WebView");
	 * }
	 *
	 * const page = await xunlei.runtime.webview.open({
	 *   headless: true,
	 *   title: "页面探测",
	 *   width: 960,
	 *   height: 720,
	 * });
	 *
	 * try {
	 *   await page.addInitScript(
	 *     "window.__miniappStartedAt = Date.now()",
	 *   );
	 *   await page.goto("https://example.com", {
	 *     waitUntil: "domcontentloaded",
	 *     timeoutMs: 10_000,
	 *   });
	 *
	 *   if (!(await page.waitForSelector("body", { timeoutMs: 5_000 }))) {
	 *     throw new Error("页面未加载完成");
	 *   }
	 *
	 *   const title = await page.execute(() => document.title);
	 *   const ready = await page.waitForFunction(
	 *     () => document.readyState === "complete",
	 *   );
	 *   const result = {
	 *     title,
	 *     ready,
	 *     url: await page.url(),
	 *     html: await page.content(),
	 *     cookies: await page.getCookies(),
	 *   };
	 *
	 *   console.log(result);
	 * } finally {
	 *   await page.close();
	 * }
	 * ```
	 */
	open(opts?: WebviewOpenOptions): Promise<WebviewPage>;
}

// ─── 二进制数据与运行时类型 ──────────────────────────────────────

export interface BlobOpenRequest {
	/** 起始字节偏移量，包含该位置的字节。 */
	offset: number;
	/** 结束字节偏移量，包含该位置的字节；未指定结束位置时为 -1。 */
	end: number;
}

export type BlobOpener = (
	request: BlobOpenRequest,
) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;

export interface BlobObjectURLOptions {
	/** 本地 HTTP 服务返回的媒体类型（MIME）。 */
	contentType?: string;
	/** 数据源总大小，单位为字节；启用字节范围请求（range 为 true）时必填。 */
	size?: number;
	/** 数据源是否支持字节范围请求。 */
	range?: boolean;
}

export interface XunleiRuntimeBlob {
	/**
	 * 为二进制数据对象或按需打开的数据流创建本地 HTTP 地址。
	 *
	 * @example 直接传入 Blob
	 * ```ts
	 * const blob = new Blob(["由微应用生成的内容\n"], {
	 *   type: "text/plain",
	 * });
	 * const url = await xunlei.runtime.blob.createObjectURL(blob);
	 *
	 * try {
	 *   const task = await xunlei.tasks.create({
	 *     req: { url },
	 *     opts: { name: "generated.txt" },
	 *   });
	 *   console.log(task.id);
	 *   // 等任务或其他消费者不再使用 url 后再撤销。
	 * } catch (error) {
	 *   await xunlei.runtime.blob.revokeObjectURL(url);
	 *   throw error;
	 * }
	 * ```
	 *
	 * @example 传入 BlobOpener，按需返回新的流
	 * ```ts
	 * const sourceUrl = "https://cdn.example.com/video.mp4";
	 * const contentLength = 100 * 1024 * 1024;
	 *
	 * const url = await xunlei.runtime.blob.createObjectURL(
	 *   async ({ offset, end }) => {
	 *     const rangeEnd = end >= 0 ? end : "";
	 *     const response = await fetch(sourceUrl, {
	 *       headers: { Range: `bytes=${offset}-${rangeEnd}` },
	 *     });
	 *     if (response.status !== 206 || !response.body) {
	 *       throw new Error("源文件未返回可用的分段数据");
	 *     }
	 *     return response.body;
	 *   },
	 *   {
	 *     contentType: "video/mp4",
	 *     size: contentLength,
	 *     range: true,
	 *   },
	 * );
	 *
	 * await xunlei.tasks.create({
	 *   req: { url },
	 *   opts: { name: "video.mp4" },
	 * });
	 * // 每次 opener 调用都要返回新的 ReadableStream；确认任务不再需要 url 后再撤销。
	 * ```
	 */
	createObjectURL(
		source: Blob | BlobOpener,
		options?: BlobObjectURLOptions,
	): Promise<string>;
	/**
	 * 撤销此前由 createObjectURL 创建的地址。
	 *
	 * @example
	 * ```ts
	 * await xunlei.runtime.blob.revokeObjectURL(url);
	 * ```
	 */
	revokeObjectURL(url: string): Promise<void>;
}

export interface XunleiRuntime {
	blob: XunleiRuntimeBlob;
	webview: XunleiRuntimeWebview;
}

export interface Xunlei {
	/** 微应用信息（只读）。 */
	info: XunleiInfo;
	/** 日志接口。 */
	logger: XunleiLogger;
	/** 设置接口。 */
	settings: XunleiSettings;
	/** 键值对存储接口。 */
	storage: XunleiStorage;
	/** 任务管理接口。 */
	tasks: XunleiMiniappTasks;
	/** 事件注册接口。 */
	events: XunleiEvents;
	/** 运行时能力接口。 */
	runtime: XunleiRuntime;
}

// ─── 其他类型 ────────────────────────────────────────────────────

export interface MiniappInfo {
	id: string;
	name: string;
	version: string;
	root?: string;
	entry?: MiniappEntryManifest;
	dev?: boolean;
}

export type MessageError = Error;

/** 用户可见错误的构造接口；微应用抛出此类错误后，宿主可通过轻提示展示错误消息。 */
export interface MessageErrorConstructor {
	new (message?: string): MessageError;
	(message?: string): MessageError;
}

declare global {
	const xunlei: Xunlei;
	const MessageError: MessageErrorConstructor;
}
