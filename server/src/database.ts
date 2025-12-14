import { DataSource, DataSourceOptions } from "typeorm";
import { ModelList } from "./models/index.js";
import { MainConfigType, MysqlConfigSchema, MysqlConfigType, PostgresqlConfigSchema, SqliteConfigSchema } from "./types/config.js";

export const createDatabaseConnection = async (config: MainConfigType): Promise<DataSource> => {
    const { databaseType, databaseConfig } = config;

    let dataSource: DataSource;

    let schemaOpts = {
        entities: ModelList,
        synchronize: true,
        logging: true,
    };

    if (databaseType === 'mysql') {
        const mysqlConfig = MysqlConfigSchema.parse(databaseConfig);
        dataSource = new DataSource({
            type: 'mysql',
            host: mysqlConfig.host,
            port: mysqlConfig.port,
            username: mysqlConfig.username,
            password: mysqlConfig.password,
            database: mysqlConfig.database,
            ...schemaOpts,
        });
    } else if (databaseType === 'sqlite') {
        const sqliteConfig = SqliteConfigSchema.parse(databaseConfig);
        let databasePath = sqliteConfig.file || 'data/database.sqlite';

        // 在 Electron 环境下，使用用户数据目录
        const isElectronEnv = process.env.ELECTRON_ENV === 'true';
        if (isElectronEnv && process.env.ELECTRON_DATA_DIR) {
            const path = await import('path');
            const fs = await import('fs');
            const dataDir = process.env.ELECTRON_DATA_DIR;

            // 确保数据目录存在
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            databasePath = path.join(dataDir, 'database.sqlite');
            console.log('Electron 环境下使用数据库路径:', databasePath);
        }

        dataSource = new DataSource({
            type: 'sqlite',
            database: databasePath,
            ...schemaOpts,
        });
    } else if (databaseType === 'postgres') {
        const postgresConfig = PostgresqlConfigSchema.parse(databaseConfig);
        dataSource = new DataSource({
            type: 'postgres',
            host: postgresConfig.host,
            port: postgresConfig.port,
            username: postgresConfig.username,
            password: postgresConfig.password,
            database: postgresConfig.database,
            ...schemaOpts,
        });
    } else {
        throw new Error(`Unsupported database type: ${databaseType}`);
    }

    await dataSource.initialize();

    return dataSource;
}