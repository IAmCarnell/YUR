import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node extends d3.SimulationNodeDatum {
  id: number
  value: number
}

interface Link {
  source: number
  target: number
  strength: number
}

interface NodeLinkVisualizationProps {
  nodes: Node[]
  links: Link[]
  width?: number
  height?: number
}

export const NodeLinkVisualization: React.FC<NodeLinkVisualizationProps> = ({
  nodes,
  links,
  width = 400,
  height = 300,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const container = svg.append('g')

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Color scale based on node values
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain(d3.extent(nodes, d => d.value) as [number, number])

    // Size scale based on node values
    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(nodes, d => Math.abs(d.value)) as [number, number])
      .range([3, 15])

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).strength(d => d.strength * 0.1))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale(Math.abs((d as Node).value)) + 2))

    // Create links
    const link = container.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .style('stroke', '#999')
      .style('stroke-opacity', d => d.strength)
      .style('stroke-width', d => Math.sqrt(d.strength) * 2)

    // Create nodes
    const node = container.selectAll('.node')
      .data(nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', d => sizeScale(Math.abs(d.value)))
      .style('fill', d => colorScale(d.value))
      .style('stroke', '#fff')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer')

    // Add tooltips
    node.append('title')
      .text(d => `Node ${d.id}: ${d.value.toFixed(4)}`)

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        const node = d as Node
        node.fx = node.x
        node.fy = node.y
      })
      .on('drag', (event, d) => {
        const node = d as Node
        node.fx = event.x
        node.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        const node = d as Node
        node.fx = null
        node.fy = null
      })

    node.call(drag)

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, links, width, height])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: '#f5f5f5', borderRadius: 4 }}
    />
  )
}