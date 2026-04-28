import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import PropTypes from 'prop-types'

const empty = []

const COLORS = ['#00C49F', '#0088FE', '#82ca9d', '#113333', '#FF3322']

export const ChartLatency = ({ data, flowNames, onClick }) => {
    return (
        <ResponsiveContainer width='95%' height={200}>
            <LineChart
                onClick={onClick}
                width={500}
                height={200}
                data={data || empty}
                margin={{
                    top: 5,
                    right: 10,
                    left: 40,
                    bottom: 20
                }}
            >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                    dataKey='y'
                    label={{
                        value: 'Input',
                        position: 'insideBottom',
                        offset: 0,
                        style: {
                            textAnchor: 'middle'
                        }
                    }}
                />
                <YAxis
                    label={{
                        value: 'Latency (ms)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        style: {
                            textAnchor: 'middle'
                        }
                    }}
                />
                <Tooltip />
                {flowNames.map((key, index) => (
                    <Line key={'line' + index} type='monotone' dataKey={flowNames[index]} stroke={COLORS[index]} activeDot={{ r: 8 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

ChartLatency.propTypes = {
    data: PropTypes.array,
    flowNames: PropTypes.array,
    onClick: PropTypes.func
}
