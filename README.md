# NiiVue + dcm2niix WASM

This repo contains a basic web app demonstrating the WASM build of [dcm2niix](https://github.com/rordenlab/dcm2niix) and [NiiVue](https://github.com/niivue/niivue). You can view the live demo [here](https://niivue.github.io/niivue-dcm2niix/).

**No data is sent to a server. Everything happens in *your* browser window, on *your* machine.** You can select a folder of DICOM images and the web app will convert those images to nifti using the WASM build of dcm2niix. You can then view the nifti images in the browser using NiiVue.

## Usage

1. Open the [live demo](https://niivue.github.io/niivue-dcm2niix/).
2. Click the "Choose files" button and select a folder of DICOM images.
3. Some browsers my show a warning about uploading multiple files. You can ifnore this warning. No data is sent to a server.
4. Use the dropdown to select a nifti file to view after conversion.
5. Click "Save nifti" if you want to get a copy of the nifti file that was converted from DICOM. 

## For Developers

You can serve a hot-reloadable web page that allows you to interactively modify the source code.

```bash
git clone https://github.com/niivue/niivue-dcm2niix.git
cd niivue-dcm2niix
npm install
npm run dev
```

## Links

- [dcm2niix](https://github.com/rordenlab/dcm2niix): this demo uses the WASM build of Chris Rorden's dcm2niix program.
- [NiiVue](https://github.com/niivue/niivue): this demo uses the NiiVue library to view medical images in the browser.

## References

### Our group's open source software and collaborative projects

- [brainchop](https://github.com/neuroneural/brainchop)
- [niimath](https://github.com/rordenlab/niimath)