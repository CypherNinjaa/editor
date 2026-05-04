'use client'

import {
  BuildingNode,
  DoorNode,
  FenceNode,
  ItemNode,
  LevelNode,
  RoofNode,
  RoofSegmentNode,
  resolveLevelId,
  sceneRegistry,
  SiteNode,
  SlabNode,
  useScene,
  WallNode,
  WindowNode,
  ZoneNode,
  type AnyNode,
  type AnyNodeId,
} from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import useEditor, {
  hasCustomPersistedEditorUiState,
  normalizePersistedEditorUiState,
  type PersistedEditorUiState,
} from '../store/use-editor'
import { CATALOG_ITEMS } from '../components/ui/item-catalog/catalog-items'

export type SceneGraph = {
  nodes: Record<string, unknown>
  rootNodeIds: string[]
}

type PersistedSelectionPath = {
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]
}

const EMPTY_PERSISTED_SELECTION: PersistedSelectionPath = {
  buildingId: null,
  levelId: null,
  zoneId: null,
  selectedIds: [],
}

const SELECTION_STORAGE_KEY = 'pascal-editor-selection'

function getSelectionStorageKey(): string {
  const projectId = useViewer.getState().projectId
  return projectId ? `${SELECTION_STORAGE_KEY}:${projectId}` : SELECTION_STORAGE_KEY
}

function getSelectionStorageReadKeys(): string[] {
  const scopedKey = getSelectionStorageKey()
  return scopedKey === SELECTION_STORAGE_KEY ? [scopedKey] : [scopedKey, SELECTION_STORAGE_KEY]
}

function getDefaultLevelIdForBuilding(
  sceneNodes: Record<string, any>,
  buildingId: string | null,
): string | null {
  if (!buildingId) {
    return null
  }

  const buildingNode = sceneNodes[buildingId]
  if (buildingNode?.type !== 'building' || !Array.isArray(buildingNode.children)) {
    return null
  }

  let firstLevelId: string | null = null

  for (const childId of buildingNode.children) {
    const levelNode = sceneNodes[childId]
    if (levelNode?.type !== 'level') {
      continue
    }

    firstLevelId ??= levelNode.id

    if (levelNode.level === 0) {
      return levelNode.id
    }
  }

  return firstLevelId
}

function normalizePersistedSelectionPath(
  selection: Partial<PersistedSelectionPath> | null | undefined,
): PersistedSelectionPath {
  return {
    buildingId: typeof selection?.buildingId === 'string' ? selection.buildingId : null,
    levelId: typeof selection?.levelId === 'string' ? selection.levelId : null,
    zoneId: typeof selection?.zoneId === 'string' ? selection.zoneId : null,
    selectedIds: Array.isArray(selection?.selectedIds)
      ? selection.selectedIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

function hasPersistedSelectionValue(selection: PersistedSelectionPath): boolean {
  return Boolean(
    selection.buildingId ||
      selection.levelId ||
      selection.zoneId ||
      selection.selectedIds.length > 0,
  )
}

function readPersistedSelection(): PersistedSelectionPath | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    for (const key of getSelectionStorageReadKeys()) {
      const rawSelection = window.localStorage.getItem(key)
      if (!rawSelection) {
        continue
      }

      return normalizePersistedSelectionPath(
        JSON.parse(rawSelection) as Partial<PersistedSelectionPath>,
      )
    }
  } catch {
    return null
  }

  return null
}

export function writePersistedSelection(selection: {
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  selectedIds: string[]
}) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const sceneNodes = useScene.getState().nodes as Record<string, any>
    const normalizedSelection = normalizePersistedSelectionPath(selection)
    const validatedSelection =
      getValidatedSelectionForScene(sceneNodes, normalizedSelection) ?? normalizedSelection

    window.localStorage.setItem(getSelectionStorageKey(), JSON.stringify(validatedSelection))
  } catch {
    // Swallow storage quota errors
  }
}

function getEditorUiStateForRestoredSelection(
  sceneNodes: Record<string, any>,
  selection: PersistedSelectionPath,
  fallbackUiState: PersistedEditorUiState,
): PersistedEditorUiState {
  if (!selection.levelId) {
    return {
      ...fallbackUiState,
      phase: 'site',
      mode: fallbackUiState.phase === 'site' ? fallbackUiState.mode : 'select',
      tool: null,
      structureLayer: 'elements',
      catalogCategory: null,
    }
  }

  if (selection.zoneId) {
    return {
      ...fallbackUiState,
      phase: 'structure',
      mode: 'select',
      tool: null,
      structureLayer: 'zones',
      catalogCategory: null,
    }
  }

  const selectedNodes = selection.selectedIds
    .map((id) => sceneNodes[id])
    .filter((node): node is Record<string, any> => Boolean(node))

  const shouldRestoreFurnishPhase =
    selectedNodes.length > 0 &&
    selectedNodes.every(
      (node) =>
        node.type === 'item' &&
        node.asset?.category !== 'door' &&
        node.asset?.category !== 'window',
    )

  return {
    ...fallbackUiState,
    phase: shouldRestoreFurnishPhase ? 'furnish' : 'structure',
    mode: 'select',
    tool: null,
    structureLayer: 'elements',
    catalogCategory: null,
  }
}

function getValidatedSelectionForScene(
  sceneNodes: Record<string, any>,
  selection: PersistedSelectionPath,
): PersistedSelectionPath | null {
  const levelNode = selection.levelId ? sceneNodes[selection.levelId] : null
  const hasValidLevel = levelNode?.type === 'level'
  const buildingNodeFromLevel =
    hasValidLevel && levelNode.parentId ? sceneNodes[levelNode.parentId] : null
  const explicitBuildingNode = selection.buildingId ? sceneNodes[selection.buildingId] : null
  const buildingId =
    buildingNodeFromLevel?.type === 'building'
      ? buildingNodeFromLevel.id
      : explicitBuildingNode?.type === 'building'
        ? explicitBuildingNode.id
        : null

  if (!buildingId) {
    return null
  }

  const levelId = hasValidLevel
    ? levelNode.id
    : getDefaultLevelIdForBuilding(sceneNodes, buildingId)

  if (levelId) {
    const zoneNode = selection.zoneId ? sceneNodes[selection.zoneId] : null
    const zoneId =
      zoneNode?.type === 'zone' && resolveLevelId(zoneNode, sceneNodes) === levelId
        ? zoneNode.id
        : null

    const selectedIds = selection.selectedIds.filter((id) => {
      const node = sceneNodes[id]
      return Boolean(node) && resolveLevelId(node, sceneNodes) === levelId
    })

    return {
      buildingId,
      levelId,
      zoneId,
      selectedIds,
    }
  }

  return {
    ...EMPTY_PERSISTED_SELECTION,
    buildingId,
  }
}

function getRestoredSelectionForScene(
  sceneNodes: Record<string, any>,
): PersistedSelectionPath | null {
  const persistedSelection = readPersistedSelection()
  if (!(persistedSelection && hasPersistedSelectionValue(persistedSelection))) {
    return null
  }

  return getValidatedSelectionForScene(sceneNodes, persistedSelection)
}

export function syncEditorSelectionFromCurrentScene() {
  const sceneNodes = useScene.getState().nodes as Record<string, any>
  const sceneRootIds = useScene.getState().rootNodeIds
  const siteNode = sceneRootIds[0] ? sceneNodes[sceneRootIds[0]] : null
  const resolve = (child: any) => (typeof child === 'string' ? sceneNodes[child] : child)
  const firstBuilding = siteNode?.children?.map(resolve).find((n: any) => n?.type === 'building')
  const firstLevel = firstBuilding?.children?.map(resolve).find((n: any) => n?.type === 'level')
  const restoredEditorUiState = normalizePersistedEditorUiState(useEditor.getState())
  const shouldRestoreEditorUiState = hasCustomPersistedEditorUiState(restoredEditorUiState)
  const restoredSelection = getRestoredSelectionForScene(sceneNodes)
  const selectionDrivenEditorUiState = restoredSelection
    ? getEditorUiStateForRestoredSelection(sceneNodes, restoredSelection, restoredEditorUiState)
    : null

  if (firstBuilding && firstLevel) {
    const isEmptyLevel = !firstLevel.children || firstLevel.children.length === 0

    // For empty projects (new/blank), always start in structure/build/wall
    // regardless of persisted state from a previous project
    if (isEmptyLevel) {
      useViewer.getState().setSelection({
        buildingId: firstBuilding.id,
        levelId: firstLevel.id,
        selectedIds: [],
        zoneId: null,
      })
      useEditor.getState().setPhase('structure')
      useEditor.getState().setStructureLayer('elements')
      useEditor.getState().setMode('build')
      useEditor.getState().setTool('wall')
      return
    }

    if (shouldRestoreEditorUiState) {
      if (restoredSelection) {
        useViewer.getState().setSelection(restoredSelection)
        useEditor.setState(
          restoredEditorUiState.phase === 'site'
            ? (selectionDrivenEditorUiState ?? restoredEditorUiState)
            : restoredEditorUiState,
        )
      } else if (restoredEditorUiState.phase === 'site') {
        useViewer.getState().resetSelection()
        useEditor.setState(restoredEditorUiState)
      } else {
        useViewer.getState().setSelection({
          buildingId: firstBuilding.id,
          levelId: firstLevel.id,
          selectedIds: [],
          zoneId: null,
        })
        useEditor.setState(restoredEditorUiState)
      }
      return
    }

    if (restoredSelection) {
      useViewer.getState().setSelection(restoredSelection)
      if (selectionDrivenEditorUiState) {
        useEditor.setState(selectionDrivenEditorUiState)
      }
      return
    }

    useViewer.getState().setSelection({
      buildingId: firstBuilding.id,
      levelId: firstLevel.id,
      selectedIds: [],
      zoneId: null,
    })
    useEditor.getState().setPhase('structure')
    useEditor.getState().setStructureLayer('elements')
  } else {
    useEditor.getState().setPhase('site')
    useViewer.getState().setSelection({
      buildingId: null,
      levelId: null,
      selectedIds: [],
      zoneId: null,
    })
  }
}

function resetEditorInteractionState() {
  useViewer.getState().setHoveredId(null)
  useViewer.getState().resetSelection()
  // Clear outliner arrays synchronously so stale Object3D refs from the old
  // scene don't leak into the post-processing pipeline's outline passes.
  const outliner = useViewer.getState().outliner
  outliner.selectedObjects.length = 0
  outliner.hoveredObjects.length = 0
  sceneRegistry.clear()
  useEditor.setState({
    phase: 'site',
    mode: 'select',
    tool: null,
    structureLayer: 'elements',
    catalogCategory: null,
    selectedItem: null,
    movingNode: null,
    selectedReferenceId: null,
    spaces: {},
    editingHole: null,
    isPreviewMode: false,
  })
}

function hasUsableSceneGraph(sceneGraph?: SceneGraph | null): sceneGraph is SceneGraph {
  return (
    !!sceneGraph &&
    Object.keys(sceneGraph.nodes ?? {}).length > 0 &&
    (sceneGraph.rootNodeIds?.length ?? 0) > 0
  )
}

export function applySceneGraphToEditor(sceneGraph?: SceneGraph | null) {
  if (hasUsableSceneGraph(sceneGraph)) {
    const { nodes, rootNodeIds } = sceneGraph
    useScene.getState().setScene(nodes as any, rootNodeIds as any)
  } else {
    useScene.getState().clearScene()
  }

  syncEditorSelectionFromCurrentScene()
}

const LOCAL_STORAGE_KEY = 'pascal-editor-scene'

function getSeedAsset(id: string) {
  return CATALOG_ITEMS.find((item) => item.id === id) ?? CATALOG_ITEMS[0]
}

function buildSeedSceneGraph(): SceneGraph {
  const site = SiteNode.parse({ children: [] })
  const level0 = LevelNode.parse({ level: 0, children: [] })
  const building = BuildingNode.parse({
    parentId: site.id,
    children: [level0.id],
  })

  const level = {
    ...level0,
    parentId: building.id,
  }

  const wallSouth = WallNode.parse({
    parentId: level.id,
    start: [0, 0],
    end: [8, 0],
    height: 2.7,
    thickness: 0.2,
  })

  const wallEast = WallNode.parse({
    parentId: level.id,
    start: [8, 0],
    end: [8, 6],
    height: 2.7,
    thickness: 0.2,
  })

  const wallNorth = WallNode.parse({
    parentId: level.id,
    start: [8, 6],
    end: [0, 6],
    height: 2.7,
    thickness: 0.2,
  })

  const wallWest = WallNode.parse({
    parentId: level.id,
    start: [0, 6],
    end: [0, 0],
    height: 2.7,
    thickness: 0.2,
  })

  const wallDivider = WallNode.parse({
    parentId: level.id,
    start: [4, 0],
    end: [4, 6],
    height: 2.7,
    thickness: 0.18,
  })

  const doorInterior = DoorNode.parse({
    parentId: wallDivider.id,
    wallId: wallDivider.id,
    position: [3, 1.05, 0],
    width: 0.9,
    height: 2.1,
  })

  const doorFront = DoorNode.parse({
    parentId: wallSouth.id,
    wallId: wallSouth.id,
    position: [6, 1.05, 0],
    width: 1.05,
    height: 2.2,
  })

  const windowSouth = WindowNode.parse({
    parentId: wallSouth.id,
    wallId: wallSouth.id,
    position: [2, 1.2, 0],
    width: 1.6,
    height: 1.2,
  })

  const windowNorth = WindowNode.parse({
    parentId: wallNorth.id,
    wallId: wallNorth.id,
    position: [2, 1.2, 0],
    width: 1.6,
    height: 1.2,
  })

  const wallSouthWithChildren = {
    ...wallSouth,
    children: [windowSouth.id, doorFront.id],
  }

  const wallNorthWithChildren = {
    ...wallNorth,
    children: [windowNorth.id],
  }

  const wallDividerWithChildren = {
    ...wallDivider,
    children: [doorInterior.id],
  }

  const slab = SlabNode.parse({
    parentId: level.id,
    polygon: [
      [0, 0],
      [8, 0],
      [8, 6],
      [0, 6],
    ],
    elevation: 0.05,
  })

  const zoneLiving = ZoneNode.parse({
    parentId: level.id,
    name: 'Living Room',
    color: '#10b981',
    polygon: [
      [0, 0],
      [4, 0],
      [4, 6],
      [0, 6],
    ],
  })

  const zoneKitchen = ZoneNode.parse({
    parentId: level.id,
    name: 'Kitchen',
    color: '#f97316',
    polygon: [
      [4, 0],
      [8, 0],
      [8, 6],
      [4, 6],
    ],
  })

  const roofSegment = RoofSegmentNode.parse({
    roofType: 'gable',
    width: 8,
    depth: 6,
    wallHeight: 0.6,
    roofHeight: 2.4,
    position: [0, 0, 0],
  })

  const roof = RoofNode.parse({
    name: 'Gable Roof',
    position: [4, 0, 3],
    children: [roofSegment.id],
  })

  const fenceSouthLeft = FenceNode.parse({
    parentId: level.id,
    start: [-3, -2],
    end: [3.2, -2],
    height: 1.4,
    style: 'rail',
    color: '#e5e7eb',
  })

  const fenceSouthRight = FenceNode.parse({
    parentId: level.id,
    start: [4.8, -2],
    end: [11, -2],
    height: 1.4,
    style: 'rail',
    color: '#e5e7eb',
  })

  const fenceEast = FenceNode.parse({
    parentId: level.id,
    start: [11, -2],
    end: [11, 8],
    height: 1.4,
    style: 'rail',
    color: '#e5e7eb',
  })

  const fenceNorth = FenceNode.parse({
    parentId: level.id,
    start: [11, 8],
    end: [-3, 8],
    height: 1.4,
    style: 'rail',
    color: '#e5e7eb',
  })

  const fenceWest = FenceNode.parse({
    parentId: level.id,
    start: [-3, 8],
    end: [-3, -2],
    height: 1.4,
    style: 'rail',
    color: '#e5e7eb',
  })

  const chair = ItemNode.parse({
    parentId: level.id,
    position: [1.6, 0, 2.2],
    rotation: [0, Math.PI / 3, 0],
    asset: getSeedAsset('livingroom-chair'),
  })

  const table = ItemNode.parse({
    parentId: level.id,
    position: [6.2, 0, 3],
    rotation: [0, -Math.PI / 2, 0],
    asset: getSeedAsset('dining-table-mo9ms5yh'),
  })

  const lamp = ItemNode.parse({
    parentId: level.id,
    position: [2.8, 0, 4.5],
    rotation: [0, 0, 0],
    asset: getSeedAsset('floor-lamp'),
  })

  const tvStand = ItemNode.parse({
    parentId: level.id,
    position: [1.4, 0, 0.7],
    rotation: [0, Math.PI, 0],
    asset: getSeedAsset('tv-stand'),
  })

  const bookshelf = ItemNode.parse({
    parentId: level.id,
    position: [0.8, 0, 5.2],
    rotation: [0, Math.PI / 2, 0],
    asset: getSeedAsset('bookshelf'),
  })

  const gardenTree = ItemNode.parse({
    parentId: site.id,
    position: [-1.6, 0, 6.6],
    rotation: [0, 0, 0],
    asset: getSeedAsset('tree'),
  })

  const gardenBush = ItemNode.parse({
    parentId: site.id,
    position: [9.6, 0, 7.1],
    rotation: [0, Math.PI / 5, 0],
    asset: getSeedAsset('bush'),
  })

  const levelWithChildren = {
    ...level,
    children: [
      wallSouth.id,
      wallEast.id,
      wallNorth.id,
      wallWest.id,
      wallDivider.id,
      slab.id,
      zoneLiving.id,
      zoneKitchen.id,
      roof.id,
      fenceSouthLeft.id,
      fenceSouthRight.id,
      fenceEast.id,
      fenceNorth.id,
      fenceWest.id,
      chair.id,
      table.id,
      lamp.id,
      tvStand.id,
      bookshelf.id,
    ],
  }

  const nodes: Record<AnyNodeId, AnyNode> = {
    [site.id]: { ...site, children: [building, gardenTree, gardenBush] },
    [building.id]: building,
    [levelWithChildren.id]: levelWithChildren,
    [wallSouthWithChildren.id]: wallSouthWithChildren,
    [wallEast.id]: wallEast,
    [wallNorthWithChildren.id]: wallNorthWithChildren,
    [wallWest.id]: wallWest,
    [wallDividerWithChildren.id]: wallDividerWithChildren,
    [doorInterior.id]: doorInterior,
    [doorFront.id]: doorFront,
    [windowSouth.id]: windowSouth,
    [windowNorth.id]: windowNorth,
    [roof.id]: roof,
    [roofSegment.id]: roofSegment,
    [fenceSouthLeft.id]: fenceSouthLeft,
    [fenceSouthRight.id]: fenceSouthRight,
    [fenceEast.id]: fenceEast,
    [fenceNorth.id]: fenceNorth,
    [fenceWest.id]: fenceWest,
    [slab.id]: slab,
    [zoneLiving.id]: zoneLiving,
    [zoneKitchen.id]: zoneKitchen,
    [chair.id]: chair,
    [table.id]: table,
    [lamp.id]: lamp,
    [tvStand.id]: tvStand,
    [bookshelf.id]: bookshelf,
    [gardenTree.id]: gardenTree,
    [gardenBush.id]: gardenBush,
  }

  return {
    nodes,
    rootNodeIds: [site.id],
  }
}

export function saveSceneToLocalStorage(scene: SceneGraph): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scene))
  } catch {
    // Swallow storage quota errors
  }
}

export function loadSceneFromLocalStorage(): SceneGraph | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SceneGraph) : buildSeedSceneGraph()
  } catch {
    return buildSeedSceneGraph()
  }
}
