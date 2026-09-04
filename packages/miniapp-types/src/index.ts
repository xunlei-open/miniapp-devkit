// ─── Manifest Types ──────────────────────────────────────────────

export interface MiniappManifest {
	/** 允许平台或发行方添加扩展字段。 */
	[key: string]: unknown;
	manifest_version?: 1;
	/** 微应用内部名称，仅用于元数据和展示，不参与微应用 ID 生成。 */
	name: string;
	/** 面向用户展示的微应用名称。 */
	title: string;
	/** 微应用简介，最多 1024 个字符。 */
	description?: string;
	version: string;
	author?: string;
	homepage?: string;
	repository?: MiniappRepositoryManifest;
	/** 微应用图标，相对于微应用包根目录。 */
	icon?: string;
	entry?: MiniappEntryManifest;
	window?: MiniappWindowOptions;
	permissions?: MiniappPermission[];
	network?: MiniappNetworkManifest;
	scripts?: MiniappScriptManifest[];
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
	/** UI 和 event JavaScript 可直接访问的远程 URL patterns。 */
	urls?: string[];
}

export type MiniappEntryType = "miniapp" | "in_app_webview";

export interface MiniappEntryManifest {
	[key: string]: unknown;
	/** 默认使用微应用自己的页面容器。 */
	type?: MiniappEntryType;
	/** miniapp 使用包内相对 URL；in_app_webview 使用完整 HTTP(S) URL。 */
	url: string;
}

export interface MiniappRepositoryManifest {
	[key: string]: unknown;
	url: string;
	directory?: string;
}

export interface MiniappWindowOptions {
	[key: string]: unknown;
	width?: number;
	height?: number;
}

export interface MiniappScriptManifest {
	[key: string]: unknown;
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
	[key: string]: unknown;
	urls?: string[];
	labels?: string[];
};

export type MiniappSettingValue = string | number | boolean;

export interface MiniappSettingManifest {
	[key: string]: unknown;
	name: string;
	title: string;
	description?: string;
	type?: "string" | "number" | "boolean";
	value?: MiniappSettingValue;
	options?: MiniappSettingOption[];
}

export interface MiniappSettingOption {
	[key: string]: unknown;
	label: string;
	value: MiniappSettingValue;
}

export type Protocol = "http" | "bt";

export type TaskStatus =
	| "ready"
	| "running"
	| "pause"
	| "wait"
	| "error"
	| "done";

export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "PATCH"
	| "HEAD"
	| "OPTIONS"
	| "CONNECT"
	| "TRACE";

export type HttpHeader = { [key: string]: string };

export interface HttpReqExtra {
	method?: HttpMethod;
	header?: HttpHeader;
	body?: string;
}

export interface BtReqExtra {
	trackers?: string[];
}

export type ReqExtra = HttpReqExtra | BtReqExtra;

export interface Request {
	/** Request url, support http(s) and magnet and local torrent file */
	url: string;
	/** Extra request options */
	extra?: ReqExtra;
	/** Request labels */
	labels?: { [key: string]: string };
	/** Skip TLS certificate verification */
	skipVerifyCert?: boolean;
}

export interface ExtensionRequest extends Request {
	/** 全量覆盖任务请求 labels */
	setLabels(labels: Record<string, string>): Promise<void>;
	/** 设置单个任务请求 label */
	putLabel(key: string, value: string): Promise<void>;
	/** 删除单个任务请求 label */
	delLabel(key: string): Promise<void>;
}

export interface FileInfo {
	name: string;
	/** File path, relative to the resource */
	path: string;
	/** File size (byte) */
	size: number;
	ctime?: string;
	req?: Request;
}

export interface Resource {
	/** Folder name when resource is a folder */
	name: string;
	/** Resource total size (byte) */
	size: number;
	/** Whether supports breakpoint continuation */
	range: boolean;
	files: FileInfo[];
	hash?: string;
}

export interface HttpOptsExtra {
	/** Concurrent connections */
	connections?: number;
}

export type OptsExtra = HttpOptsExtra;

export interface Options {
	/** Specify the file name */
	name?: string;
	/** Specify the path to save the file */
	path?: string;
	/** Select file indices to download */
	selectFiles?: number[];
	/** Download extra options */
	extra?: OptsExtra;
}

export type ExtractStatus =
	| ""
	| "queued"
	| "waitingParts"
	| "extracting"
	| "done"
	| "error";

export interface TaskProgress {
	/** Download used time (ns) */
	used: number;
	/** Download speed (byte/s) */
	speed: number;
	/** Downloaded size (byte) */
	downloaded: number;
	/** Upload speed (byte/s) */
	uploadSpeed: number;
	/** Uploaded size (byte) */
	uploaded: number;
	/** Archive extraction status */
	extractStatus?: ExtractStatus;
	/** Archive extraction progress (0-100) */
	extractProgress?: number;
	/** Multi-part archive base name */
	multiPartBaseName?: string;
	/** Multi-part archive part number (1-indexed) */
	multiPartNumber?: number;
	/** Whether this is the first part in multi-part archive */
	multiPartIsFirst?: boolean;
}

// ─── Task Types ──────────────────────────────────────────────────

export interface Task {
	/** Task id */
	id: string;
	/** Protocol type */
	protocol: Protocol;
	/** Task display name */
	name: string;
	/** Task metadata */
	meta: {
		req: Request;
		res: Resource;
		opts: Options;
	};
	/** Task status */
	status: TaskStatus;
	/** Task is uploading */
	uploading: boolean;
	/** Task progress */
	progress: TaskProgress;
	/** Task total size (byte) */
	size: number;
	/** Task created time, ISO 8601 format */
	createdAt: string;
	/** Task updated time, ISO 8601 format */
	updatedAt: string;
}

export interface TaskDetailResult extends Omit<Task, "meta"> {
	meta: {
		req: Request;
		res: Resource;
		opts: Options;
	};
}

export interface TaskFileAccessInput {
	taskId: string;
	fileIndex: number;
}

export interface TaskFileAccessResult {
	/** 用于只读访问任务文件内容的临时 HTTP URL。 */
	url: string;
}

/**
 * 扩展任务类型，提供任务控制能力。
 * 在 onStart / onError 事件的上下文中使用。
 */
export interface ExtensionTask extends Task {
	meta: Omit<Task["meta"], "req"> & {
		req: ExtensionRequest;
	};
	/** 覆盖任务请求 URL */
	setUrl(url: string): Promise<void>;
}

export interface OnErrorExtensionTask extends ExtensionTask {
	/** 恢复任务 */
	continue(): Promise<void>;
}

export interface TaskCreateInput {
	req: Request;
	opts?: Options;
}

export interface TaskListInput {
	offset?: number;
	limit?: number;
	status?: Task["status"] | Task["status"][];
	sort?: "createdAtAsc" | "createdAtDesc";
}

export interface TaskListResult {
	ids: string[];
	total: number;
	offset: number;
	limit: number;
}

export interface TaskDetailInput {
	id: string;
}

export interface TaskUpdateInput {
	id: string;
	req?: Request;
	opts?: Options;
}

export interface TaskDeleteInput {
	id: string;
	deleteFiles?: boolean;
}

export interface TaskDeleteResult {
	id: string;
	deleted: boolean;
}

// ─── Event Context Types ─────────────────────────────────────────

/** onResolve 事件上下文 */
export interface OnResolveContext {
	/** 用户请求信息（只读） */
	req: Request;
	/** 解析结果，脚本需填充此字段 */
	res?: Resource;
}

/** onStart 事件上下文 */
export interface OnStartContext {
	/** 当前任务信息 */
	task: ExtensionTask;
}

/** onError 事件上下文 */
export interface OnErrorContext {
	/** 出错时的任务信息 */
	task: OnErrorExtensionTask;
	/** 错误详情（只读） */
	error: Error;
}

/** onDone 事件上下文 */
export interface OnDoneContext {
	/** 完成时的任务信息（只读，不支持 setUrl / labels 等控制方法） */
	task: Task;
}

// ─── Event Handler Types ─────────────────────────────────────────

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

// ─── Platform API Types ──────────────────────────────────────────

/** 微应用信息（只读） */
export interface XunleiInfo {
	/** 微应用稳定身份，由本地目录路径或签名公钥派生。 */
	identity: string;
	/** 微应用内部名称，对应 manifest.name */
	name: string;
	/** 微应用作者 */
	author: string;
	/** 微应用展示名称，对应 manifest.title */
	title: string;
	/** 微应用版本，对应 manifest.version */
	version: string;
}

/** 微应用日志接口 */
export interface XunleiLogger {
	debug(message?: unknown, ...optionalParams: unknown[]): void;
	info(message?: unknown, ...optionalParams: unknown[]): void;
	warn(message?: unknown, ...optionalParams: unknown[]): void;
	error(message?: unknown, ...optionalParams: unknown[]): void;
}

/** 微应用设置接口 */
export interface XunleiSettings {
	/** 按 manifest.settings[].name 挂载设置值 */
	[key: string]: MiniappSettingValue | undefined;
}

/** 微应用键值对存储接口 */
export interface XunleiStorage {
	/**
	 * 获取指定 key 的值，不存在时返回空字符串 ""。
	 */
	get(key: string): Promise<string>;
	/**
	 * 设置指定 key 的值，如果 key 不存在则创建。
	 */
	set(key: string, value: string): Promise<void>;
	/**
	 * 移除指定 key 的键值对。
	 */
	remove(key: string): Promise<void>;
	/**
	 * 清除所有键值对。
	 */
	clear(): Promise<void>;
	/**
	 * 返回所有存储的 key 列表。
	 */
	keys(): Promise<string[]>;
}

export interface XunleiTasks {
	create(input: TaskCreateInput): Promise<Task>;
	list(input?: TaskListInput): Promise<TaskListResult>;
	detail(input: TaskDetailInput): Promise<TaskDetailResult>;
	update(input: TaskUpdateInput): Promise<Task>;
	delete(input: TaskDeleteInput): Promise<TaskDeleteResult>;
}

export interface XunleiMiniappTasks extends XunleiTasks {
	file: {
		access(input: TaskFileAccessInput): Promise<TaskFileAccessResult>;
	};
}

export interface XunleiEvents {
	onResolve(handler: XunleiOnResolveHandler): void;
	onStart(handler: XunleiOnStartHandler): void;
	onError(handler: XunleiOnErrorHandler): void;
	onDone(handler: XunleiOnDoneHandler): void;
}

export interface WebviewOpenOptions {
	headless?: boolean;
	debug?: boolean;
	title?: string;
	width?: number;
	height?: number;
	userAgent?: string;
}

export interface WebviewGotoOptions {
	timeoutMs?: number;
	waitUntil?: "load" | "domcontentloaded";
}

export interface WebviewClickOptions {
	delay?: number;
}

export interface WebviewTypeOptions {
	delay?: number;
}

export interface WebviewWaitOptions {
	timeoutMs?: number;
	pollIntervalMs?: number;
}

export interface WebviewWaitForSelectorOptions extends WebviewWaitOptions {
	visible?: boolean;
	hidden?: boolean;
}

export interface WebviewCookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: string | number | Date;
	secure?: boolean;
	httpOnly?: boolean;
}

export type WebviewExecutable<T = unknown> =
	| string
	| ((...args: unknown[]) => T | Promise<T>);

export interface WebviewPage {
	addInitScript(script: string): Promise<void>;
	goto(url: string, opts?: WebviewGotoOptions): Promise<void>;
	execute<T = unknown>(
		scriptOrFn: WebviewExecutable<T>,
		...args: unknown[]
	): Promise<T>;
	focus(selector: string): Promise<void>;
	click(selector: string, opts?: WebviewClickOptions): Promise<void>;
	type(
		selector: string,
		text: string,
		opts?: WebviewTypeOptions,
	): Promise<void>;
	waitForSelector(
		selector: string,
		opts?: WebviewWaitForSelectorOptions,
	): Promise<boolean>;
	waitForFunction<T = unknown>(
		scriptOrFn: WebviewExecutable<T>,
		...args: unknown[]
	): Promise<T | null>;
	getCookies(): Promise<WebviewCookie[]>;
	setCookie(cookie: WebviewCookie): Promise<void>;
	deleteCookie(cookie: WebviewCookie): Promise<void>;
	clearCookies(): Promise<void>;
	url(): Promise<string>;
	content(): Promise<string>;
	close(): Promise<void>;
}

export interface XunleiRuntimeWebview {
	isAvailable(): Promise<boolean>;
	open(opts?: WebviewOpenOptions): Promise<WebviewPage>;
}

export interface BlobOpenRequest {
	/** Inclusive byte offset. */
	offset: number;
	/** Inclusive end offset, or -1 when no end offset was requested. */
	end: number;
}

export type BlobOpener = (
	request: BlobOpenRequest,
) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;

export interface BlobObjectURLOptions {
	/** MIME type exposed by the local HTTP transport. */
	contentType?: string;
	/** Total source size in bytes. Required when range is true. */
	size?: number;
	/** Whether the source supports byte-range requests. */
	range?: boolean;
}

export interface XunleiRuntimeBlob {
	/** Creates a local HTTP URL backed by a Blob or a lazily opened stream. */
	createObjectURL(
		source: Blob | BlobOpener,
		options?: BlobObjectURLOptions,
	): Promise<string>;
	/** Revokes a URL previously returned by createObjectURL. */
	revokeObjectURL(url: string): Promise<void>;
}

export interface XunleiRuntime {
	blob: XunleiRuntimeBlob;
	webview: XunleiRuntimeWebview;
}

export interface Xunlei {
	/** 微应用信息（只读） */
	info: XunleiInfo;
	/** 日志接口 */
	logger: XunleiLogger;
	/** 设置接口 */
	settings: XunleiSettings;
	/** 键值对存储 */
	storage: XunleiStorage;
	/** 任务管理 */
	tasks: XunleiMiniappTasks;
	/** 事件注册 */
	events: XunleiEvents;
	/** 运行时能力 */
	runtime: XunleiRuntime;
}

// ─── Misc Types ──────────────────────────────────────────────────

export interface MiniappInfo {
	id: string;
	name: string;
	version: string;
	root?: string;
	entry?: MiniappEntryManifest;
	dev?: boolean;
}

export type MessageError = Error;

/** 微应用抛出后，宿主可 toast 其 message 的用户可见错误。 */
export interface MessageErrorConstructor {
	new (message?: string): MessageError;
	(message?: string): MessageError;
}

declare global {
	const xunlei: Xunlei;
	const MessageError: MessageErrorConstructor;
}
