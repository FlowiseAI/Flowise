import { CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, BarChart } from 'recharts'
import PropTypes from 'prop-types'

// i18n
import { useTranslation } from 'react-i18next'

export const ChartTokens = ({ data, flowNames }) => {
    const { t } = useTranslation()
    return (
        <ResponsiveContainer width='95%' height={200}>
            <BarChart
                width={500}
                height={200}
                data={data}
                margin={{
                    top: 5,
                    right: 10,
                    left: 20,
                    bottom: 20
                }}
                barCategoryGap='30%'
            >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                    dataKey='y'
                    label={{
                        value: t('evaluations.input'),
                        position: 'insideBottom',
                        offset: 0,
                        style: {
                            textAnchor: 'middle'
                        }
                    }}
                />
                <YAxis
                    label={{
                        value: t('evaluations.tokens'),
                        angle: -90,
                        position: 'insideLeft',
                        offset: 10,
                        style: {
                            textAnchor: 'middle'
                        }
                    }}
                />
                <Tooltip />
                {flowNames.map((name, index) => (
                    <>
                        <Bar dataKey={name + ' Prompt'} stackId={`${index}_a`} fill='#2233FF' />
                        <Bar dataKey={name + ' Completion'} stackId={`${index}_a`} fill='#82CA9D' />
                    </>
                ))}
            </BarChart>
        </ResponsiveContainer>
    )
}

ChartTokens.propTypes = {
    data: PropTypes.array,
    flowNames: PropTypes.array
}
