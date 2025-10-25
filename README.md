# WebP Generator Plugin for Figma

<a href='https://ko-fi.com/webpgen' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />

![Cover](figma/Cover_Art.png)

**_Export WebP files from Figma for Web, Android, and iOS_**

### Features

- Export any selected Figma node as WebP
- Android densities supported: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- Automatically generates the correct folder structure for Android or Web projects
- The uplifting feeling of having made the project a little better


### Export Structure

**Android output:**

```
drawable-mdpi \    1x
    image.webp
drawable-hdpi \    1.5x
    image.webp
drawable-xhdpi \   2x
    image.webp
drawable-xxhdpi \  3x
    image.webp
drawable-xxxhdpi \ 4x
```

**Web output:**

```
image \
    image_1x.webp
    image_1_5x.webp
    image_2x.webp
    image_3x.webp
    image_4x.webp
```

**iOS (limited WebP support)**

Uses Apple's asset catalog convention:
```
image \
    image.webp    1x
    image@2x.webp 2x
    image@3x.webp 3x
```

> [!WARNING]  
> iOS does not support WebP in asset catalogs natively (as of now), so a small helper is needed.

### SwiftUI: WebP Image Loader

If you want to load WebP images in SwiftUI, add something like this (images must be bundled with your app):

```swift
extension Image {
    init?(webp name: String) {
        // Determine current screen scale (1x / 2x / 3x)
        let scale = Int(UIScreen.main.scale.rounded())
        let candidates = [
            "\(name)@\(scale)x",
            "\(name)@3x",
            "\(name)@2x",
            name
        ]

        for fileName in candidates {
            if let url = Bundle.main.url(forResource: fileName, withExtension: "webp"),
               let data = try? Data(contentsOf: url),
               let uiImage = UIImage(data: data, scale: CGFloat(scale)) {
                self = Image(uiImage: uiImage)
                return
            }
        }
        return nil
    }
}
```

Check out the plugin at [Figma](https://www.figma.com/community/plugin/1181873200384736932).
