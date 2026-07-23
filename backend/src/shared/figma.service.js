import { ValidationError } from '../errors/index.js'

/**
 * Helper to extract Figma File Key from a Figma share URL.
 * Supports design/file URL paths.
 * 
 * @param {string} url 
 * @returns {string} Figma File Key
 */
export function parseFigmaUrl(url) {
  if (!url) {
    throw new ValidationError('Figma URL is required')
  }

  // Matches figma.com/file/KEY/... or figma.com/design/KEY/... or figma.com/proto/KEY/...
  const regex = /figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9_-]+)/
  const match = url.match(regex)
  if (!match || !match[1]) {
    throw new ValidationError('Invalid Figma URL format. URL should be like https://www.figma.com/design/KEY/... or a prototype URL.')
  }

  return match[1]
}

/**
 * Fetch Figma File JSON Tree from Figma API.
 * 
 * @param {string} fileKey 
 * @param {string} token 
 * @returns {Promise<object>}
 */
export async function fetchFigmaFile(fileKey, token) {
  if (!token) {
    throw new ValidationError('Figma Personal Access Token is required')
  }

  const url = `https://api.figma.com/v1/files/${fileKey}`
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  })

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new ValidationError('Unauthorized. Please check if your Figma Personal Access Token is correct and has access to this file.')
    }
    if (response.status === 404) {
      throw new ValidationError('Figma file not found. Please verify the URL is correct and public or accessible by your token.')
    }
    const errorText = await response.text()
    throw new Error(`Figma API returned error status ${response.status}: ${errorText}`)
  }

  return await response.json()
}

/**
 * Fetch PNG URLs of specific Node IDs (Frames/Screens).
 * 
 * @param {string} fileKey 
 * @param {string[]} nodeIds 
 * @param {string} token 
 * @returns {Promise<Record<string, string>>} Mapping of Node ID -> CDN image URL
 */
export async function fetchFigmaImages(fileKey, nodeIds, token) {
  if (!nodeIds || nodeIds.length === 0) return {}

  const idsParam = encodeURIComponent(nodeIds.join(','))
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=png`
  
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Figma frame images: ${response.statusText}`)
  }

  const result = await response.json()
  return result.images || {}
}

/**
 * Recursively extracts screens (top-level FRAMEs inside Canvas)
 * and lists key interactive elements, texts, and transitions in them.
 * 
 * @param {object} figmaDocument The document root node returned by Figma API
 * @returns {object[]} Array of extracted screens/frames
 */
export function extractScreens(figmaDocument, figmaFileUrl = '') {
  if (!figmaDocument || !figmaDocument.document) {
    return []
  }

  let targetPageId = null
  let targetNodeId = null

  if (figmaFileUrl) {
    try {
      const urlObj = new URL(figmaFileUrl)
      const pageIdParam = urlObj.searchParams.get('page-id')
      if (pageIdParam) {
        targetPageId = decodeURIComponent(pageIdParam).replace(/-/g, ':')
      }
      const nodeIdParam = urlObj.searchParams.get('node-id') || urlObj.searchParams.get('starting-point-node-id')
      if (nodeIdParam) {
        targetNodeId = decodeURIComponent(nodeIdParam).replace(/-/g, ':')
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  const screens = []

  // Document -> Canvases (Pages)
  const canvases = figmaDocument.document.children || []

  // Resolve targetPageId from targetNodeId if page-id is missing
  if (targetNodeId && !targetPageId) {
    for (const canvas of canvases) {
      if (canvas.type !== 'CANVAS') continue
      
      const checkNode = (node) => {
        if (!node) return false
        if (node.id === targetNodeId) return true
        if (node.children) {
          for (const child of node.children) {
            if (checkNode(child)) return true
          }
        }
        return false
      }

      if (checkNode(canvas)) {
        targetPageId = canvas.id
        break
      }
    }
  }

  for (const canvas of canvases) {
    if (canvas.type !== 'CANVAS') continue

    // Filter by targetPageId if available
    if (targetPageId && canvas.id !== targetPageId) {
      continue
    }

    // Recursively find top-level screens in canvas (traversing SECTIONS and GROUPs)
    const findScreens = (node) => {
      if (!node) return

      if (node.type === 'FRAME') {
        // Exclude very small frames that are components or decorative elements (not actual screens)
        if (node.absoluteBoundingBox && (node.absoluteBoundingBox.width < 150 || node.absoluteBoundingBox.height < 150)) {
          return
        }
        const screenElements = []
        const transitions = []

        // Recursive helper to traverse descendants and extract UI cues
        const traverseElements = (elementNode) => {
          if (!elementNode) return

          // Capture transitions/prototype links
          if (elementNode.transitionNodeID) {
            transitions.push({
              triggerNodeId: elementNode.id,
              triggerName: elementNode.name || 'element',
              targetFrameId: elementNode.transitionNodeID
            })
          }

          // Classify nodes
          if (elementNode.type === 'TEXT') {
            screenElements.push({
              id: elementNode.id,
              type: 'text',
              name: elementNode.name,
              value: elementNode.characters || ''
            })
          } else if (
            elementNode.type === 'INSTANCE' || 
            elementNode.type === 'COMPONENT' || 
            (elementNode.name && (
              elementNode.name.toLowerCase().includes('button') || 
              elementNode.name.toLowerCase().includes('input') ||
              elementNode.name.toLowerCase().includes('field') ||
              elementNode.name.toLowerCase().includes('checkbox') ||
              elementNode.name.toLowerCase().includes('select')
            ))
          ) {
            // Infer semantic type based on name or metadata
            let inferredType = 'component'
            const lowerName = (elementNode.name || '').toLowerCase()
            if (lowerName.includes('button')) inferredType = 'button'
            else if (lowerName.includes('input') || lowerName.includes('field')) inferredType = 'input'
            else if (lowerName.includes('checkbox')) inferredType = 'checkbox'
            else if (lowerName.includes('select') || lowerName.includes('dropdown')) inferredType = 'select'

            // Look for nested text if component is an instance (e.g. Button has a label text child)
            let innerText = ''
            if (elementNode.children) {
              const textNode = elementNode.children.find(c => c.type === 'TEXT')
              if (textNode) innerText = textNode.characters || ''
            }

            screenElements.push({
              id: elementNode.id,
              type: inferredType,
              name: elementNode.name,
              value: innerText || ''
            })
          }

          // Traverse children
          if (elementNode.children && elementNode.type !== 'INSTANCE') {
            for (const c of elementNode.children) {
              traverseElements(c)
            }
          }
        }

        // Run traversal for this screen frame
        if (node.children) {
          for (const frameChild of node.children) {
            traverseElements(frameChild)
          }
        }

        screens.push({
          id: node.id,
          name: node.name,
          pageName: canvas.name,
          elements: screenElements,
          transitions: transitions
        })

        // Stop traversing screen frames inside screen frames
        return
      }

      // If it's a Section or a Group, traverse its children
      if (node.type === 'SECTION' || node.type === 'GROUP') {
        if (node.children) {
          for (const child of node.children) {
            findScreens(child)
          }
        }
      }
    }

    const children = canvas.children || []
    for (const child of children) {
      findScreens(child)
    }
  }

  return screens
}
