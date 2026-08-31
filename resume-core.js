export const SUPPORTED_SCHEMA_VERSION = '1.0.0';
export const WEB_SURFACE = 'resume_web';
export const PDF_SURFACE = 'resume_pdf';

export function nextLanguage(language) {
    return language === 'zh' ? 'en' : 'zh';
}

export function localized(value, language) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return value[language] ?? value.en ?? value.zh ?? '';
}

export function localizedLines(value, language) {
    if (Array.isArray(value)) return value;
    const lines = value?.[language] ?? value?.en ?? value?.zh;
    return Array.isArray(lines) ? lines : [];
}

export function recordVisibleOn(record, surface) {
    return record?.status === 'published'
        && Array.isArray(record.surfaces)
        && record.surfaces.includes(surface);
}

export function visibleRecords(payload, collection) {
    const records = Array.isArray(payload?.[collection]) ? payload[collection] : [];
    return records.filter((record) => recordVisibleOn(record, payload.surface));
}

export function projectMedia(project) {
    const candidates = [project?.cover, ...(Array.isArray(project?.gallery) ? project.gallery : [])];
    const seenIds = new Set();
    const seenUrls = new Set();
    return candidates.filter((media) => {
        if (!media?.url || !String(media.mime_type).startsWith('image/')) return false;
        if (seenUrls.has(media.url) || (media.id && seenIds.has(media.id))) return false;
        seenUrls.add(media.url);
        if (media.id) seenIds.add(media.id);
        return true;
    });
}

export function buildResumeApiUrl(apiUrl, surface) {
    const url = new URL(apiUrl);
    url.searchParams.set('surface', surface);
    return url.toString();
}

export function assertRuntimeResume(payload, expectedSurface = WEB_SURFACE) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Resume response must be a JSON object');
    }
    if (payload.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        throw new Error(`Unsupported resume schema: ${payload.schema_version ?? 'missing'}`);
    }
    if (payload.source?.system !== 'GWorkspace') {
        throw new Error('Resume response is not sourced from GWorkspace');
    }
    if (payload.surface !== expectedSurface) {
        throw new Error(`Expected ${expectedSurface}, received ${payload.surface ?? 'missing'}`);
    }
    if (payload.locale !== null) {
        throw new Error('Resume client requires a bilingual response');
    }
    if (!recordVisibleOn(payload.profile, expectedSurface)) {
        throw new Error(`Resume profile is not published on ${expectedSurface}`);
    }
    if (!Array.isArray(payload.profile.contacts)) {
        throw new Error('Resume response is missing profile contacts');
    }
    for (const collection of ['skills', 'experience', 'education', 'projects']) {
        if (!Array.isArray(payload[collection])) {
            throw new Error(`Resume response is missing ${collection}`);
        }
    }
    if (!payload.settings?.pdf?.filename || !['en', 'zh'].includes(payload.settings.default_language)) {
        throw new Error('Resume response is missing rendering settings');
    }
    return payload;
}

export function saveResumeCache(storage, cacheKey, payload, requestUrl, now = new Date()) {
    const value = {
        cache_version: 1,
        cached_at: now.toISOString(),
        request_url: requestUrl,
        schema_version: payload.schema_version,
        source: payload.source,
        payload,
    };
    storage.setItem(cacheKey, JSON.stringify(value));
    return value;
}

export function loadResumeCache(storage, cacheKey, requestUrl) {
    try {
        const serialized = storage.getItem(cacheKey);
        if (!serialized) return null;
        const cached = JSON.parse(serialized);
        if (cached.cache_version !== 1 || cached.request_url !== requestUrl) return null;
        assertRuntimeResume(cached.payload, WEB_SURFACE);
        return cached;
    } catch {
        try {
            storage.removeItem(cacheKey);
        } catch {
            // Storage can be unavailable in restricted browsing contexts.
        }
        return null;
    }
}
