import Foundation
import Security

protocol CookieVault {
    func load() throws -> Data?
    func save(_ data: Data) throws
    func clear() throws
}

struct KeychainCookieVault: CookieVault {
    private let service: String
    private let account = "http-cookies"

    init(service: String = Bundle.main.bundleIdentifier ?? "kr.co.nsrnb.familyhwatu.macos") {
        self.service = service
    }

    func load() throws -> Data? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw error(status) }
        return item as? Data
    }

    func save(_ data: Data) throws {
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return }
        guard updateStatus == errSecItemNotFound else { throw error(updateStatus) }
        var item = baseQuery
        attributes.forEach { item[$0.key] = $0.value }
        let addStatus = SecItemAdd(item as CFDictionary, nil)
        guard addStatus == errSecSuccess else { throw error(addStatus) }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw error(status) }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }

    private func error(_ status: OSStatus) -> NSError {
        NSError(
            domain: NSOSStatusErrorDomain,
            code: Int(status),
            userInfo: [NSLocalizedDescriptionKey: SecCopyErrorMessageString(status, nil) as String? ?? "키체인 쿠키 저장 오류"]
        )
    }
}

final class SecureCookieStore {
    private struct Record: Codable, Equatable {
        let name: String
        let value: String
        let domain: String
        let path: String
        let expiresDate: Date?
        let secure: Bool
        let sessionOnly: Bool

        init(_ cookie: HTTPCookie) {
            name = cookie.name
            value = cookie.value
            domain = cookie.domain.lowercased()
            path = cookie.path
            expiresDate = cookie.expiresDate
            secure = cookie.isSecure
            sessionOnly = cookie.isSessionOnly
        }

        var cookie: HTTPCookie? {
            var properties: [HTTPCookiePropertyKey: Any] = [
                .name: name,
                .value: value,
                .domain: domain,
                .path: path,
                .secure: secure ? "TRUE" : "FALSE"
            ]
            if let expiresDate { properties[.expires] = expiresDate }
            return HTTPCookie(properties: properties)
        }
    }

    private let vault: CookieVault
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var records: [Record] = []
    private var hasLoaded = false

    init(vault: CookieVault = KeychainCookieVault()) {
        self.vault = vault
    }

    func requestHeader(for url: URL, now: Date = Date()) -> String? {
        loadIfNeeded()
        removeExpired(now: now)
        let cookies = records.filter { matches($0, url: url, now: now) }.compactMap(\.cookie)
        return HTTPCookie.requestHeaderFields(with: cookies)["Cookie"]
    }

    func consume(response: HTTPURLResponse, for url: URL, now: Date = Date()) {
        loadIfNeeded()
        let fields: [String: String] = Dictionary(uniqueKeysWithValues: response.allHeaderFields.compactMap { key, value in
            guard let key = key as? String else { return nil }
            return (key, String(describing: value))
        })
        let cookies = HTTPCookie.cookies(withResponseHeaderFields: fields, for: url)
        guard !cookies.isEmpty else { return }
        for cookie in cookies {
            let incoming = Record(cookie)
            records.removeAll { $0.name == incoming.name && $0.domain == incoming.domain && $0.path == incoming.path }
            if incoming.expiresDate.map({ $0 > now }) != false { records.append(incoming) }
        }
        removeExpired(now: now)
        persist()
    }

    func clear() {
        records = []
        hasLoaded = true
        try? vault.clear()
    }

    private func loadIfNeeded() {
        guard !hasLoaded else { return }
        defer { hasLoaded = true }
        guard let data = try? vault.load(), let values = try? decoder.decode([Record].self, from: data) else { return }
        records = values.filter { !$0.sessionOnly }
    }

    private func persist() {
        let persistent = records.filter { !$0.sessionOnly }
        if persistent.isEmpty { try? vault.clear(); return }
        guard let data = try? encoder.encode(persistent) else { return }
        try? vault.save(data)
    }

    private func removeExpired(now: Date) {
        let previous = records
        records.removeAll { $0.expiresDate.map { $0 <= now } ?? false }
        if records != previous { persist() }
    }

    private func matches(_ record: Record, url: URL, now: Date) -> Bool {
        guard let host = url.host?.lowercased(), record.expiresDate.map({ $0 > now }) != false else { return false }
        let cookieDomain = record.domain.hasPrefix(".") ? String(record.domain.dropFirst()) : record.domain
        let domainMatches = host == cookieDomain || (record.domain.hasPrefix(".") && host.hasSuffix(".\(cookieDomain)"))
        let requestPath = url.path.isEmpty ? "/" : url.path
        return domainMatches && requestPath.hasPrefix(record.path) && (!record.secure || url.scheme == "https")
    }
}
