import { Niivue, NVImage, DRAG_MODE, SLICE_TYPE, MULTIPLANAR_TYPE, SHOW_RENDER } from '@niivue/niivue'
import { Dcm2niix } from '@niivue/dcm2niix'
import { dicomLoader } from '@niivue/dicom-loader'
import './niivue.css'

/**
 * Load DICOM files from a manifest URL using the Dcm2niix WebAssembly backend.
 * 
 * This function fetches a text-based manifest file containing relative paths to DICOM images,
 * downloads and wraps them as `File` objects with proper `webkitRelativePath` attributes,
 * runs the DICOM-to-NIfTI conversion via `@niivue/dcm2niix`, and updates the UI with the result.
 * 
 * This is a manual reference implementation that mirrors the functionality of `@niivue/dicom-loader`.
 * 
 * @param manifestUrl - A full URL pointing to a manifest text file with relative DICOM paths
 * @returns A promise that resolves to an array of converted NIfTI `File` objects
 */
async function loadDicomsUsingDcm2niixFromManifest(manifestUrl) {
  console.log('Starting manual DICOM load from manifest via dcm2niix...')
  try {
    hideSaveButton()
    showLoadingCircle()

    const baseUrl = new URL(manifestUrl)
    const response = await fetch(manifestUrl)
    const text = await response.text()
    const urls = text.trim().split('\n')

    const dicomFiles = await Promise.all(
      urls.map(async (relativePath) => {
        const url = new URL(relativePath, baseUrl)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch DICOM: ${url}`)
        const arrayBuffer = await res.arrayBuffer()
        const filename = url.pathname.split('/').pop()
        const fullPath = `series/${filename}`
        const file = new File([arrayBuffer], filename)
        Object.defineProperty(file, 'webkitRelativePath', {
          value: fullPath,
          writable: false
        })
        return file
      })
    )

    const dcm2niix = new Dcm2niix()
    await dcm2niix.init()
    let resultFileList = await dcm2niix.input(dicomFiles).run()
    resultFileList = resultFileList.filter(f => f.name.endsWith('.nii') || f.name.endsWith('.nii.gz'))

    updateSelectItems(resultFileList)
    hideLoadingCircle()
    showFileSelect()

    fileSelect.value = 0
    fileSelect.dispatchEvent(new Event('change'))
    showText('Loaded via manual dcm2niix')

    return resultFileList
  } catch (err) {
    console.error('Error in loadDicomsUsingDcm2niixFromManifest:', err)
    hideLoadingCircle()
    hideFileSelect()
    showText('Error loading DICOMs manually')
    return []
  }
}

/**
 * Load DICOMs from a manifest using @niivue/dicom-loader
 * and display the time taken to load and decode them.
 * 
 * @param manifestURL - URL to a text manifest with relative DICOM file paths
 */
async function loadDicomsWithNiivueLoader(manifestURL) {
  console.log('loading manifest')
  const startTime = performance.now()

  nv.useDicomLoader({
    loader: dicomLoader
  })

  await nv.loadDicoms([
    {
      url: manifestURL,
      isManifest: true
    }
  ])

  const vol = nv.volumes[nv.volumes.length - 1]  
  const name = vol?.name || 'Unnamed volume'
  const endTime = performance.now()
  const elapsed = ((endTime - startTime) / 1000).toFixed(2)
  showText(`Loaded ${name} in ${elapsed} seconds`)
  showSaveButton()
}



// Page-wide variables
const nv = new Niivue({ dragAndDropEnabled: false })
let resultFileList = []
let downloadFile = null

const showText = (text) => {
  document.getElementById('intensity').innerHTML = text
}
const showSaveButton = () => document.getElementById('saveButton').classList.remove('hidden')
const hideSaveButton = () => document.getElementById('saveButton').classList.add('hidden')
const showLoadingCircle = () => loadingCircle.classList.remove('hidden')
const hideLoadingCircle = () => loadingCircle.classList.add('hidden')
const showFileSelect = () => fileSelect.classList.remove('hidden')
const hideFileSelect = () => fileSelect.classList.add('hidden')
const removeAllVolumes = () => nv.volumes.forEach(v => nv.removeVolume(v))
const removeSelectItems = () => { while (fileSelect.firstChild) fileSelect.removeChild(fileSelect.firstChild) }
const updateSelectItems = (files) => {
  removeSelectItems()
  files.forEach((file, i) => {
    const option = document.createElement('option')
    option.value = i
    option.text = file.name
    fileSelect.appendChild(option)
  })
  const option = document.createElement('option')
  option.value = -1
  option.text = 'Select a file'
  option.selected = true
  fileSelect.appendChild(option)
}

const handleFileSelectChange = async (event) => {
  if (resultFileList.length === 0) return
  const selectedIndex = parseInt(event.target.value)
  if (selectedIndex === -1) return
  const selectedFile = resultFileList[selectedIndex]
  downloadFile = selectedFile
  if (selectedFile.name.endsWith('.nii')) {
    removeAllVolumes()
    const image = await NVImage.loadFromFile({
      file: selectedFile,
      name: selectedFile.name
    })
    nv.addVolume(image)
  }
  showSaveButton()
}

const handleSaveButtonClick = async () => {
  if (nv.volumes.length === 0) {
    console.log('no volumes found')
    return
  }
  const vol = nv.volumes[0]
  const name = vol.name || 'volume'
  const ext = vol.niiFile?.name?.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
  console.log('saving ', name)
  await nv.saveImage({filename: `${name}${ext}`})
}

async function main() {
  fileSelect.onchange = handleFileSelectChange
  saveButton.onclick = handleSaveButtonClick
  document.getElementById('loadManifestBtn').onclick = () => {
    loadDicomsWithNiivueLoader('https://niivue.github.io/niivue-demo-images/dicom/niivue-manifest.txt')
  }

  nv.onLocationChange = (data) => showText(data.string)
  nv.onVolumeAdded = (vol) => showText(`Loaded: ${vol.name}`)

  const canvas = document.getElementById('gl')
  nv.attachToCanvas(canvas)

  nv.opts.yoke3Dto2DZoom = true
  nv.opts.crosshairGap = 5
  nv.setInterpolation(true)
  nv.setMultiplanarLayout(MULTIPLANAR_TYPE.GRID)
  nv.setSliceType(SLICE_TYPE.MULTIPLANAR)
  nv.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS
  nv.opts.dragMode = DRAG_MODE.slicer3D
}

main()
