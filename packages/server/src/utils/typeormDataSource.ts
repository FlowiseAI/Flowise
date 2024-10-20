import { DataSource } from 'typeorm'
import { getDataSource } from '../DataSource'

export const dataSource: DataSource = getDataSource()
