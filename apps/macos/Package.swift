// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "FamilyHwatuMac",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "FamilyHwatu", targets: ["FamilyHwatu"])
    ],
    targets: [
        .executableTarget(
            name: "FamilyHwatu",
            resources: [
                .process("Resources/cards"),
                .copy("Resources/audio"),
                .copy("Resources/legal")
            ],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .testTarget(
            name: "FamilyHwatuTests",
            dependencies: ["FamilyHwatu"],
            swiftSettings: [.swiftLanguageMode(.v5)]
        )
    ]
)
