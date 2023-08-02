import { h } from 'https://esm.sh/preact@10.4.7'
import { useCallback, useEffect, useMemo, useState } from 'https://esm.sh/preact@10.4.7/hooks'
import htm from 'https://esm.sh/htm@3.0.4'

const html = htm.bind(h)

function formatNumber(input) {
  if (!input) return 0
  
  const config = {
    maximumFractionDigits: 2, 
    minimumFractionDigits: 2
  }
  
  return input.toLocaleString('en-GB', config)
}

/**
 * A nav tree component that renders nodes based on date-keyed entries.
 * @param {object} props Components props
 */
function StatsTree ({ activeNode, treeData, onTreeNodeClick }) {
  // `activeNode` is set to '' (an empty string) when the overview is the active view
  const overviewClass = useMemo(() => {
    return activeNode ? 'main-node' : 'main-node active-node'
  }, [activeNode])
  
  return html`<div class="stats-tree">
    <ul>
      <li class="${overviewClass}">
        <button id="overview" class="overview-btn" onClick="${onTreeNodeClick}">
          Stats Overview
        </button>
      </li>
      ${Object.keys(treeData).map(key => {
        if (key === '_totals') return

        const isActive = activeNode.includes(key)
        const mainNodeClass = isActive ? 'main-node active-node' : 'main-node'
        const mainNodeText = key
        
        return html`<li class="${mainNodeClass}">
          <span style="pointer-events: none;">${mainNodeText}</span>
          <ul>
            ${treeData[key].map(n => {
              if (n.AssetName) {
                const currentId = `${key}_${n.AssetName}`
                const nodeClass = currentId === activeNode ? 'detail-node active' : 'detail-node'

                return html`<li class="${nodeClass}">
                  <button id="${currentId}" onClick="${onTreeNodeClick}">${n.AssetName}</button>
                </li>`
              }
            })}
          </ul>
        </li>`
      })}
    </ul>
  </div>`
}

/**
 * The main view component.
 * Calculates averages for the "Overview" and renders icon tiles.
 * @param {object} props Components props
 */
function StatsView({ displayData }) {
  let averages = null
  const data = useMemo(() => displayData?.content || null, [displayData])
  const showOverview = !data?.AssetName
  const statContainerClass = useMemo(() => {
    return showOverview ? 'stats-container stats-overview' : 'stats-container'
  }, [showOverview])
  const tiles = [
    {
      name: 'DistanceOnBike',
      icon: 'assets/bike.svg',
      label: 'Kilometers on Bike',
      transform: (val) => formatNumber((val / 1000))
    },
    {
      name: 'DistanceOnFoot',
      icon: 'assets/shoe.svg',
      label: 'Kilometers on Foot',
      transform: (val) => formatNumber((val / 1000))
    },
    {
      name: 'MetersOfHeight',
      icon: 'assets/mountain.svg',
      label: 'Meters of Height',
      transform: (val) => formatNumber(val)
    },
    {
      name: 'NumberOfDays',
      icon: 'assets/calendar.svg',
      label: 'Number of Days'
    }
  ]

  if (data) {
    if (showOverview && data.NumberOfDays > 1) {
      const k = ['DistanceOnBike', 'DistanceOnFoot', 'MetersOfHeight']
      
      averages = {
        Days: data.NumberOfDays
      }

      k.forEach(avgKey => {
        if (data.hasOwnProperty(avgKey)) {
          averages[avgKey] = (data[avgKey] / averages.Days)
        }
      })
    }
  }

  return html`<div class="stats-main">
    ${displayData
      ? html`${showOverview
          ? html`<h2 class="text-center" style="margin-bottom: 0;">Summary</h2>`
          : html`<h2 class="text-center">Daily Statistics</h2>
            <p class="text-center text-muted" style="margin-bottom: 0;">Date: ${displayData.date}<br />
            Device Id: ${displayData.device}</p>`
        }
        ${data
          ? html`<${StatsViewTiles} containerClass="${statContainerClass}" data="${data}" tiles="${tiles}" formatAll="${false}" />`
          : null
        }
        ${averages && showOverview
          ? html`<h2 class="text-center" style="margin-top: 2rem;">Averages</h2>
            <p class="text-center text-muted" style="margin-bottom: 0;">${averages.Days} Days</p>
            <${StatsViewTiles} containerClass="stats-container" data="${averages}" tiles="${tiles}" formatAll="${true}" />`
          : null
        }`
      : html`<p class="text-center">Something went wrong :(</p>`
    }
  </div>`
}

/**
 * The icon tiles component that renders a grid of icons + data.
 * @param {object} props Components props
 */
function StatsViewTiles({ containerClass, data, formatAll, tiles }) {
  if (data) {
    return html`<div class="${containerClass}">
      ${tiles.map(el => {
        const tileData = data[el.name]
        
        if (tileData) {
          const displayVal = el.transform
            ? el.transform(tileData)
            : formatAll
              ? formatNumber(tileData)
              : tileData
  
          return html`<div class="stats-item">
            <span class="icon">
              <img src="${el.icon}" alt="${`Icon ${el.label}`}" />
            </span>
            <span class="value">${displayVal}</span>
            <span class="label">${el.label}</span>
          </div>`
        }
      })}
    </div>`
  }
}

export default function() {
  return {
    /**
     * Wrapper component that consists of the tree and the viewer.
     * Provides the method that handles the tree node clicks and manages the 
     * data displayed in the viewer.
     * @param {props} props Component props
     */
    Stats: ({ statMap }) => {
      const [activeNode, setActiveNode] = useState('')
      const [displayData, setDisplayData] = useState(null)
      const noStatsText = 'No data found.'
    
      // Set "overview" as the default view if we have the necessary data
      useEffect(() => {
        if (statMap?._totals) {
          setDisplayData({
            content: statMap._totals
          })
        }
      }, [statMap])
    
      const onTreeNodeClick = useCallback((evt) => {
        const nodeId = evt.target.id
        const showOverview = nodeId === 'overview'
        
        setActiveNode(showOverview ? '' : nodeId)
    
        if (showOverview) {
          setDisplayData({
            content: statMap._totals
          })
        } else {
          const nodePath = nodeId.split('_')
          setDisplayData({
            date: nodePath[0],
            device: nodePath[1],
            content: statMap[nodePath[0]].find(o => o.AssetName == nodePath[1])
          })
        }
      }, [statMap])
    
      return html`
        ${statMap ? (
          html`<section class="stats-viewer">
            <${StatsTree} activeNode="${activeNode}" treeData="${statMap}" onTreeNodeClick="${onTreeNodeClick}" />
            <${StatsView} displayData="${displayData}" />
          </section>`
        ) : html`<p class="text-center text-muted">${noStatsText}</p>` }
      ` 
    }
  }
}
