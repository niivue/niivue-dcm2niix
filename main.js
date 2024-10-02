import { Niivue, NVImage, DRAG_MODE, SLICE_TYPE, MULTIPLANAR_TYPE, SHOW_RENDER } from '@niivue/niivue'
import { Dcm2niix } from '@niivue/dcm2niix'
import './niivue.css'

// page-wide niivue instance
const nv = new Niivue({
  dragAndDropEnabled: false, // disable drag and drop since we want to use input from the file input element
})
// reference to the results list from dcm2niix for use later
let resultFileList = []
let conversionTime = 0


const handleSaveButtonClick = () => {
  const name = nv.volumes[0].name
  nv.volumes[0].saveToDisk(name)
}

const showSaveButton = () => {
  const saveButton = document.getElementById('saveButton')
  saveButton.classList.remove('hidden')
}

const hideSaveButton = () => {
  const saveButton = document.getElementById('saveButton')
  saveButton.classList.add('hidden')
}

const showLoadingCircle = () => {
  loadingCircle.classList.remove('hidden')
}

const hideLoadingCircle = () => {
  loadingCircle.classList.add('hidden')
}

const hideFileSelect = () => {
  fileSelect.classList.add('hidden')
}

const showFileSelect = () => {
  fileSelect.classList.remove('hidden')
}

const handleLocationChange = (data) => {
  document.getElementById("intensity").innerHTML = data.string
}

const showText = (time) => {
  document.getElementById("intensity").innerHTML = time
}

const removeAllVolumes = () => {
  const vols = nv.volumes
  for (let i = 0; i < vols.length; i++) {
    nv.removeVolume(vols[i])
  }
}

const handleFileSelectChange = async (event) => {
  if (resultFileList.length === 0) {
    console.log('No files to select from');
    return
  }
  const selectedIndex = parseInt(event.target.value)
  if (selectedIndex === -1) {
    return
  }
  removeAllVolumes()
  const selectedFile = resultFileList[selectedIndex]
  console.log(selectedFile);
  const image = await NVImage.loadFromFile({
    file: selectedFile,
    name: selectedFile.name
  })
  await nv.addVolume(image)
  showSaveButton()
}

const removeSelectItems = () => {
  const select = document.getElementById('fileSelect')
  // remove all options elements
  while (select.firstChild) {
    select.removeChild(select.firstChild)
  }
}

const updateSelectItems = (files) => {
  removeSelectItems()
  const select = document.getElementById('fileSelect')
  select.innerHTML = ''
  for (let i = 0; i < files.length; i++) {
    const option = document.createElement('option')
    option.value = i
    option.text = files[i].name
    select.appendChild(option)
  }
  // make first option say 'Select a file'
  const option = document.createElement('option')
  option.value = -1
  option.text = 'Select a file'
  option.selected = true
  select.appendChild(option)
}

const runDcm2niix = async (files) => {
  try {
    hideSaveButton()
    showLoadingCircle()
    const dcm2niix = new Dcm2niix();
    await dcm2niix.init();
    const t0 = Date.now()
    resultFileList = await dcm2niix.input(files).run()
    const t1 = Date.now()
    conversionTime = (t1 - t0) / 1000
    showText(`Conversion time: ${conversionTime} seconds`)
    // filter out files that are not nifti (.nii) so we don't show them
    // in the select dropdown
    resultFileList = resultFileList.filter(file => file.name.endsWith('.nii'))
    updateSelectItems(resultFileList)
    console.log(resultFileList);
    hideLoadingCircle()
    showFileSelect()
    // set the first file as the selected file
    fileSelect.value = 0
    // trigger the change event
    const event = new Event('change')
    fileSelect.dispatchEvent(event)
  } catch (error) {
    console.error(error);
    resultFileList = []
    hideLoadingCircle()
    hideFileSelect()
    showText('Error converting files. Check the console for more information.')
  }
}

const ensureObjectOfObjects = (obj) => {
  // check for the "length" property
  if (obj.length) {
    return obj
  } else {
    return { 0: obj }
  }
}

async function handleDrop(e) {
  e.preventDefault(); // prevent navigation to open file
  const items = e.dataTransfer.items;
  try {
    showLoadingCircle()
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await traverseFileTree(item, '', files);
      }
    }
    const dcm2niix = new Dcm2niix();
    await dcm2niix.init()
    resultFileList = await dcm2niix.inputFromDropItems(files).run()
    resultFileList = resultFileList.filter(file => file.name.endsWith('.nii'))
    updateSelectItems(resultFileList)
    console.log(resultFileList);
    hideLoadingCircle()
    showFileSelect()
    // set the first file as the selected file
    fileSelect.value = 0
    // trigger the change event
    const event = new Event('change')
    fileSelect.dispatchEvent(event)
    showText('')
  } catch (error) {
    console.error(error);
    hideLoadingCircle()
    hideFileSelect()
    showText('Error converting files. Check the console for more information.')
  }
}

async function traverseFileTree(item, path = '', fileArray) {
  return new Promise((resolve) => {
    if (item.isFile) {
      item.file(file => {
        file.fullPath = path + file.name;
        // IMPORTANT: _webkitRelativePath is required for dcm2niix to work.
        // We need to add this property so we can parse multiple directories correctly.
        // the "webkitRelativePath" property on File objects is read-only, so we can't set it directly, hence the underscore.
        file._webkitRelativePath = path + file.name;
        fileArray.push(file);
        resolve();
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const readAllEntries = () => {
        dirReader.readEntries(entries => {
          if (entries.length > 0) {
            const promises = [];
            for (const entry of entries) {
              promises.push(traverseFileTree(entry, path + item.name + '/', fileArray));
            }
            Promise.all(promises).then(readAllEntries);
          } else {
            resolve();
          }
        });
      };
      readAllEntries();
    }
  });
}

async function main() {
  fileInput.addEventListener('change', async (event) => {
    if (event.target.files.length === 0) {
      console.log('No files selected');
      return;
    }
    console.log('Selected files:', event.target.files);
    const selectedFiles = event.target.files;
    const files = ensureObjectOfObjects(selectedFiles) // probably not needed anymore with new dcm2niix version
    await runDcm2niix(files)
  });

  // when user changes the file to view
  fileSelect.onchange = handleFileSelectChange

  // handle drag and drop
  dropTarget.ondrop = handleDrop;
  dropTarget.ondragover = (e) => {e.preventDefault();}

  // when user clicks save
  saveButton.onclick = handleSaveButtonClick

  // crosshair location change event
  nv.onLocationChange = handleLocationChange
  // get canvas element
  const canvas = document.getElementById('gl')
  nv.attachToCanvas(canvas)
  // set some options
  nv.opts.yoke3Dto2DZoom = true
  nv.opts.crosshairGap = 5
  nv.setInterpolation(true) // linear
  nv.setMultiplanarLayout(MULTIPLANAR_TYPE.GRID)
  nv.setSliceType(SLICE_TYPE.MULTIPLANAR)
  nv.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS
  nv.opts.dragMode = DRAG_MODE.slicer3D
}

main()
