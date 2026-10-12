import Cocoa

// ============================================================================
// 墨枢 · InkVerse (by Timskt) — Native macOS Swift + CoreGraphics Logo Engine
// Generates true 32-bit RGBA (ColorType 6) PNGs with zero white border on
// macOS squircles, following the app-logo-design-engine specification.
// ============================================================================

let size = NSSize(width: 512, height: 512)
let image = NSImage(size: size)
image.lockFocus()

guard let ctx = NSGraphicsContext.current?.cgContext else {
    fputs("Failed to acquire CGContext\n", stderr)
    exit(1)
}

// 1. Clear canvas with 100% Alpha Transparency (guarantees ColorType 6 RGBA)
ctx.clear(CGRect(origin: .zero, size: size))

let space = CGColorSpaceCreateDeviceRGB()

// 2. Base Squircle (Apple HIG standard: 440x440 inside 512x512, radius 104)
let baseRect = CGRect(x: 36, y: 36, width: 440, height: 440)
let basePath = CGPath(roundedRect: baseRect, cornerWidth: 104, cornerHeight: 104, transform: nil)

// 3. Soft Ambient Drop Shadow (RGBA with true alpha)
ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -14),
    blur: 30,
    color: NSColor(calibratedRed: 0.0, green: 0.0, blue: 0.0, alpha: 0.58).cgColor
)
ctx.addPath(basePath)
ctx.setFillColor(NSColor(calibratedRed: 0.06, green: 0.07, blue: 0.10, alpha: 1.0).cgColor)
ctx.fillPath()
ctx.restoreGState()

// 4. Squircle Interior Fill, Ambient Glow & Rim Highlight
ctx.saveGState()
ctx.addPath(basePath)
ctx.clip()

let bgColors = [
    NSColor(calibratedRed: 0.13, green: 0.14, blue: 0.20, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.07, green: 0.08, blue: 0.12, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.04, green: 0.05, blue: 0.08, alpha: 1.0).cgColor
] as CFArray
let bgGrad = CGGradient(colorsSpace: space, colors: bgColors, locations: [0.0, 0.55, 1.0])!
ctx.drawLinearGradient(bgGrad, start: CGPoint(x: 120, y: 476), end: CGPoint(x: 392, y: 36), options: [])

// Subtle warm literary radial glow in upper-left & celadon glow in lower-right (startRadius: 0!)
let warmGlowColors = [
    NSColor(calibratedRed: 0.92, green: 0.48, blue: 0.16, alpha: 0.25).cgColor,
    NSColor(calibratedRed: 0.92, green: 0.48, blue: 0.16, alpha: 0.0).cgColor
] as CFArray
let warmGlow = CGGradient(colorsSpace: space, colors: warmGlowColors, locations: [0.0, 1.0])!
ctx.drawRadialGradient(
    warmGlow,
    startCenter: CGPoint(x: 155, y: 370),
    startRadius: 0,
    endCenter: CGPoint(x: 155, y: 370),
    endRadius: 250,
    options: [.drawsBeforeStartLocation]
)

let cyanGlowColors = [
    NSColor(calibratedRed: 0.16, green: 0.72, blue: 0.90, alpha: 0.20).cgColor,
    NSColor(calibratedRed: 0.16, green: 0.72, blue: 0.90, alpha: 0.0).cgColor
] as CFArray
let cyanGlow = CGGradient(colorsSpace: space, colors: cyanGlowColors, locations: [0.0, 1.0])!
ctx.drawRadialGradient(
    cyanGlow,
    startCenter: CGPoint(x: 360, y: 150),
    startRadius: 0,
    endCenter: CGPoint(x: 360, y: 150),
    endRadius: 240,
    options: [.drawsBeforeStartLocation]
)

// Subtle Oriental Seal Frame Grid Lines (Very faint architectural precision ring)
ctx.setStrokeColor(NSColor(calibratedRed: 0.95, green: 0.78, blue: 0.48, alpha: 0.08).cgColor)
ctx.setLineWidth(1.2)
let innerFrame = CGRect(x: 64, y: 64, width: 384, height: 384)
let innerFramePath = CGPath(roundedRect: innerFrame, cornerWidth: 80, cornerHeight: 80, transform: nil)
ctx.addPath(innerFramePath)
ctx.strokePath()

// Outer Squircle Glass Rim
ctx.setLineWidth(2.5)
ctx.setStrokeColor(NSColor(calibratedRed: 0.96, green: 0.76, blue: 0.45, alpha: 0.30).cgColor)
ctx.addPath(basePath)
ctx.strokePath()

// 5. Central Geometric Mark: "InkVerse / 墨枢" Origami Quill Prism & Open Scroll Wings
// 5A. Left Open-Book / Scroll Wing (Warm Amber-Bronze Facet)
let leftScrollWing = CGMutablePath()
leftScrollWing.move(to: CGPoint(x: 242, y: 136))
leftScrollWing.addLine(to: CGPoint(x: 104, y: 196))
leftScrollWing.addLine(to: CGPoint(x: 122, y: 332))
leftScrollWing.addLine(to: CGPoint(x: 242, y: 274))
leftScrollWing.closeSubpath()

ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -8),
    blur: 18,
    color: NSColor(calibratedRed: 0, green: 0, blue: 0, alpha: 0.45).cgColor
)
ctx.addPath(leftScrollWing)
ctx.clip()
let leftWingColors = [
    NSColor(calibratedRed: 0.99, green: 0.74, blue: 0.26, alpha: 0.96).cgColor,
    NSColor(calibratedRed: 0.85, green: 0.36, blue: 0.12, alpha: 0.96).cgColor
] as CFArray
let leftWingGrad = CGGradient(colorsSpace: space, colors: leftWingColors, locations: [0.0, 1.0])!
ctx.drawLinearGradient(leftWingGrad, start: CGPoint(x: 104, y: 332), end: CGPoint(x: 242, y: 136), options: [])
ctx.restoreGState()

// 5B. Right Open-Book / Matrix Wing (Celadon-Cyan to Indigo AI Facet)
let rightScrollWing = CGMutablePath()
rightScrollWing.move(to: CGPoint(x: 270, y: 136))
rightScrollWing.addLine(to: CGPoint(x: 408, y: 196))
rightScrollWing.addLine(to: CGPoint(x: 390, y: 332))
rightScrollWing.addLine(to: CGPoint(x: 270, y: 274))
rightScrollWing.closeSubpath()

ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -8),
    blur: 18,
    color: NSColor(calibratedRed: 0, green: 0, blue: 0, alpha: 0.45).cgColor
)
ctx.addPath(rightScrollWing)
ctx.clip()
let rightWingColors = [
    NSColor(calibratedRed: 0.24, green: 0.84, blue: 0.95, alpha: 0.96).cgColor,
    NSColor(calibratedRed: 0.36, green: 0.40, blue: 0.94, alpha: 0.96).cgColor
] as CFArray
let rightWingGrad = CGGradient(colorsSpace: space, colors: rightWingColors, locations: [0.0, 1.0])!
ctx.drawLinearGradient(rightWingGrad, start: CGPoint(x: 408, y: 332), end: CGPoint(x: 270, y: 136), options: [])
ctx.restoreGState()

// 5C. Central Sovereign Fountain-Pen Nib Prism (Ascending Crown of Creation)
let nibLeftFacet = CGMutablePath()
nibLeftFacet.move(to: CGPoint(x: 256, y: 424)) // Apex of Nib
nibLeftFacet.addLine(to: CGPoint(x: 164, y: 280)) // Left Shoulder
nibLeftFacet.addLine(to: CGPoint(x: 202, y: 152)) // Left Base
nibLeftFacet.addLine(to: CGPoint(x: 256, y: 186)) // Inner Spine Base
nibLeftFacet.closeSubpath()

ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -10),
    blur: 22,
    color: NSColor(calibratedRed: 0, green: 0, blue: 0, alpha: 0.55).cgColor
)
ctx.addPath(nibLeftFacet)
ctx.clip()
let nibLeftColors = [
    NSColor(calibratedRed: 1.00, green: 0.94, blue: 0.74, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.97, green: 0.64, blue: 0.20, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.80, green: 0.28, blue: 0.12, alpha: 1.0).cgColor
] as CFArray
let nibLeftGrad = CGGradient(colorsSpace: space, colors: nibLeftColors, locations: [0.0, 0.55, 1.0])!
ctx.drawLinearGradient(nibLeftGrad, start: CGPoint(x: 256, y: 424), end: CGPoint(x: 180, y: 152), options: [])
ctx.restoreGState()

let nibRightFacet = CGMutablePath()
nibRightFacet.move(to: CGPoint(x: 256, y: 424)) // Apex of Nib
nibRightFacet.addLine(to: CGPoint(x: 348, y: 280)) // Right Shoulder
nibRightFacet.addLine(to: CGPoint(x: 310, y: 152)) // Right Base
nibRightFacet.addLine(to: CGPoint(x: 256, y: 186)) // Inner Spine Base
nibRightFacet.closeSubpath()

ctx.saveGState()
ctx.addPath(nibRightFacet)
ctx.clip()
let nibRightColors = [
    NSColor(calibratedRed: 0.95, green: 0.84, blue: 0.55, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.84, green: 0.44, blue: 0.15, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.58, green: 0.19, blue: 0.12, alpha: 1.0).cgColor
] as CFArray
let nibRightGrad = CGGradient(colorsSpace: space, colors: nibRightColors, locations: [0.0, 0.55, 1.0])!
ctx.drawLinearGradient(nibRightGrad, start: CGPoint(x: 256, y: 424), end: CGPoint(x: 332, y: 152), options: [])
ctx.restoreGState()

// 5D. Precision Capillary Slit & Heart Breather Hole (Perfectly Centered on Spine)
ctx.saveGState()
ctx.setStrokeColor(NSColor(calibratedRed: 0.06, green: 0.07, blue: 0.10, alpha: 0.95).cgColor)
ctx.setLineWidth(6.5)
ctx.setLineCap(.round)
ctx.move(to: CGPoint(x: 256, y: 416))
ctx.addLine(to: CGPoint(x: 256, y: 282))
ctx.strokePath()

// Diamond Breather Core at center of Nib
let breatherDiamond = CGMutablePath()
breatherDiamond.move(to: CGPoint(x: 256, y: 298))
breatherDiamond.addLine(to: CGPoint(x: 234, y: 272))
breatherDiamond.addLine(to: CGPoint(x: 256, y: 246))
breatherDiamond.addLine(to: CGPoint(x: 278, y: 272))
breatherDiamond.closeSubpath()
ctx.addPath(breatherDiamond)
ctx.setFillColor(NSColor(calibratedRed: 0.06, green: 0.07, blue: 0.10, alpha: 0.96).cgColor)
ctx.fillPath()
ctx.setStrokeColor(NSColor(calibratedRed: 1.0, green: 0.88, blue: 0.58, alpha: 0.90).cgColor)
ctx.setLineWidth(2.5)
ctx.addPath(breatherDiamond)
ctx.strokePath()
ctx.restoreGState()

// 5E. Oriental Cinnabar Author Seal Stamp ("朱砂文人藏书印 · 墨") at Bottom Center
let sealRect = CGRect(x: 212, y: 82, width: 88, height: 88)
let sealPath = CGPath(roundedRect: sealRect, cornerWidth: 20, cornerHeight: 20, transform: nil)

ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -6),
    blur: 16,
    color: NSColor(calibratedRed: 0.0, green: 0.0, blue: 0.0, alpha: 0.55).cgColor
)
ctx.addPath(sealPath)
ctx.clip()
let sealColors = [
    NSColor(calibratedRed: 0.89, green: 0.19, blue: 0.17, alpha: 1.0).cgColor,
    NSColor(calibratedRed: 0.64, green: 0.08, blue: 0.08, alpha: 1.0).cgColor
] as CFArray
let sealGrad = CGGradient(colorsSpace: space, colors: sealColors, locations: [0.0, 1.0])!
ctx.drawLinearGradient(sealGrad, start: CGPoint(x: 212, y: 170), end: CGPoint(x: 300, y: 82), options: [])
ctx.restoreGState()

// Seal Gold Rim & Stylized Geometric Seal Glyph ("墨 / TIM") inside Stamp
ctx.saveGState()
ctx.setStrokeColor(NSColor(calibratedRed: 1.0, green: 0.88, blue: 0.64, alpha: 0.88).cgColor)
ctx.setLineWidth(2.5)
ctx.addPath(sealPath)
ctx.strokePath()

let sealInnerRect = CGRect(x: 221, y: 91, width: 70, height: 70)
let sealInnerPath = CGPath(roundedRect: sealInnerRect, cornerWidth: 12, cornerHeight: 12, transform: nil)
ctx.setStrokeColor(NSColor(calibratedRed: 1.0, green: 0.92, blue: 0.78, alpha: 0.45).cgColor)
ctx.setLineWidth(1.5)
ctx.addPath(sealInnerPath)
ctx.strokePath()

// Draw crisp geometric Seal Script Monogram ("文 / 墨" Seal Structure)
ctx.setStrokeColor(NSColor(calibratedRed: 1.0, green: 0.95, blue: 0.86, alpha: 0.96).cgColor)
ctx.setLineWidth(3.8)
ctx.setLineCap(.round)
ctx.setLineJoin(.round)

// Upper Seal Box (Black/Ink "黑" upper frame in Xiaozhuan seal script)
let topSealBox = CGRect(x: 236, y: 127, width: 40, height: 22)
let topSealPath = CGPath(roundedRect: topSealBox, cornerWidth: 4, cornerHeight: 4, transform: nil)
ctx.addPath(topSealPath)
ctx.strokePath()

// Middle crossbar inside upper box + central spine down to earth base ("土")
ctx.move(to: CGPoint(x: 236, y: 138))
ctx.addLine(to: CGPoint(x: 276, y: 138))
ctx.move(to: CGPoint(x: 256, y: 149))
ctx.addLine(to: CGPoint(x: 256, y: 103))
// Lower crossbars ("土" earth foundation of 墨)
ctx.move(to: CGPoint(x: 240, y: 115))
ctx.addLine(to: CGPoint(x: 272, y: 115))
ctx.move(to: CGPoint(x: 233, y: 103))
ctx.addLine(to: CGPoint(x: 279, y: 103))
ctx.strokePath()
ctx.restoreGState()

ctx.restoreGState() // End squircle clip

image.unlockFocus()

// 6. Export True 32-bit RGBA PNG (ColorType 6)
guard let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode PNG\n", stderr)
    exit(1)
}

let outputPaths = CommandLine.arguments.dropFirst()
if outputPaths.isEmpty {
    try pngData.write(to: URL(fileURLWithPath: "web/public/logo.png"))
} else {
    for path in outputPaths {
        let url = URL(fileURLWithPath: path)
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try pngData.write(to: url)
        print("Generated true 32-bit RGBA PNG -> \(path)")
    }
}
