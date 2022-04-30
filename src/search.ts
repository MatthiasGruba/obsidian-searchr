import { CachedMetadata, TAbstractFile, TFile } from 'obsidian'
import MiniSearch, { SearchResult } from 'minisearch'

type IndexedNote = {
	path: string
	basename: string
	content: string
	headings1: string
	headings2: string
	headings3: string
}

type SearchMatch = {
	match: string
	offset: number
}

type ResultNote = {
	score: number
	path: string
	basename: string
	content: string
	foundWords: string[]
	matches: SearchMatch[]
}

const TOKENIZER_STRING = /[|\n\r -#%-*,-/:;?@[-\]_{}\u00A0\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]+/u

function waitMs(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}

function escapeRegex(str: string): string {
	return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function stringsToRegex(strings: string[]): RegExp {
	return new RegExp(strings.map(escapeRegex).join('|'), 'gi')
}

function extractHeadingsFromCache(
	cache: CachedMetadata,
	level: number,
): string[] {
	return (
		cache.headings?.filter(h => h.level === level).map(h => h.heading) ?? []
	)
}

const minisearchInstance = new MiniSearch({
	tokenize: text => text.split(TOKENIZER_STRING),
	idField: 'path',
	fields: ['basename', 'content', 'headings1', 'headings2', 'headings3'],
})

const indexedNotes: Record<string, IndexedNote> = {}

export async function loadNotes(): Promise<void> {
	const files = app.vault.getMarkdownFiles()

	for (let i = 0; i < files.length; ++i) {
		if (i % 10 === 0) await waitMs(0)
		const file = files[i]
		if (file) await addToIndex(file)
	}
}

export function fetchSearchResults(query: string): SearchResult[] {
	if (query === '') {
		return [];
	}
	return minisearchInstance.search(query, {
		prefix: true,
		fuzzy: term => (term.length > 4 ? 0.2 : false),
		combineWith: 'AND',
		boost: {
			basename: 2,
			headings1: 1.5,
			headings2: 1.3,
			headings3: 1.1,
		},
	})
}

export function getMatches(text: string, reg: RegExp): SearchMatch[] {
	let match: RegExpExecArray | null = null
	const matches: SearchMatch[] = []
	while ((match = reg.exec(text)) !== null) {
		const m = match[0]
		if (m) matches.push({ match: m, offset: match.index })
	}
	return matches
}

export function enhanceSearchResults(
	results: SearchResult[]
): ResultNote[] {
	const suggestions = results.map(result => {
		const note = indexedNotes[result.id]
		if (note == null) {
			throw new Error(`Note "${result.id}" not indexed`)
		}

		const words = Object.keys(result.match)
		const matches = getMatches(note.content, stringsToRegex(words))

		return {
			score: result.score,
			foundWords: words,
			matches,
			...note,
		}
	})

	return suggestions.sort((a, b) => b.score - a.score);
}

export async function addToIndex(file: TAbstractFile): Promise<void> {
	if (!(file instanceof TFile) || file.extension !== 'md') {
		return
	}
	try {
		const fileCache = app.metadataCache.getFileCache(file)

		if (indexedNotes[file.path]) {
			throw new Error()
		}

		const content = await app.vault.cachedRead(file)

		const note: IndexedNote = {
			basename: file.basename,
			content,
			path: file.path,
			headings1: fileCache
				? extractHeadingsFromCache(fileCache, 1).join(' ')
				: '',
			headings2: fileCache
				? extractHeadingsFromCache(fileCache, 2).join(' ')
				: '',
			headings3: fileCache
				? extractHeadingsFromCache(fileCache, 3).join(' ')
				: '',
		}
		minisearchInstance.add(note)
		indexedNotes[note.path] = note
	} catch (e) {
		console.trace(file.basename + ' could not be index')
	}
}

export function removeFromIndex(file: TAbstractFile): void {
	if (file instanceof TFile && file.path.endsWith('.md')) {
		return removeFromIndexByPath(file.path)
	}
}

export function removeFromIndexByPath(path: string): void {
	const note = indexedNotes[path]
	if (note != null) {
		minisearchInstance.remove(note)
		delete indexedNotes[path]
	}
}
