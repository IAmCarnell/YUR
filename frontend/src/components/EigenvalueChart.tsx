import React from 'react'
import Plot from 'react-plotly.js'
import { useTheme } from '@mui/material'

interface EigenvalueChartProps {
  data: number[]
}

export const EigenvalueChart: React.FC<EigenvalueChartProps> = ({
  data,
}) => {
  const theme = useTheme()

  // Prepare data for plotting
  const indices = data.map((_, i) => i)
  const realParts = data.map(val => typeof val === 'number' ? val : 0)

  const plotData = [
    {
      x: indices,
      y: realParts,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      marker: {
        size: 6,
        color: realParts,
        colorscale: 'Viridis',
        colorbar: {
          title: 'Eigenvalue',
          titlefont: { color: theme.palette.text.primary },
          tickfont: { color: theme.palette.text.primary },
        },
      },
      line: {
        color: theme.palette.primary.main,
        width: 2,
      },
      name: 'Eigenvalues',
    },
  ]

  const layout = {
    title: {
      text: 'Eigenvalue Spectrum',
      font: { color: theme.palette.text.primary },
    },
    xaxis: {
      title: 'Index',
      color: theme.palette.text.primary,
      gridcolor: theme.palette.divider,
    },
    yaxis: {
      title: 'Eigenvalue',
      color: theme.palette.text.primary,
      gridcolor: theme.palette.divider,
    },
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    font: {
      color: theme.palette.text.primary,
    },
    margin: { l: 50, r: 50, t: 50, b: 50 },
  }

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
  }

  return (
    <Plot
      data={plotData}
      layout={layout}
      config={config}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  )
}