import * as SQLite from 'expo-sqlite';
import { OptionsVolumeData } from './providers/OptionsVolumeProvider';
import { Platform } from 'react-native';

// Define custom interfaces for expo-sqlite result structure
interface SQLiteResult {
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
  insertId?: number;
  rowsAffected: number;
}

export interface MovingAverageData {
  symbol: string;
  ma10: number | null;
  ma50: number | null;
  ma100: number | null;
  ma200: number | null;
  lastUpdated: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private database: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;

  // Define database schema
  private DB_SCHEMA = {
    OPTION_VOLUME_HISTORY: `
      CREATE TABLE IF NOT EXISTS option_volume_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        call_volume INTEGER NOT NULL,
        put_volume INTEGER NOT NULL,
        call_open_interest INTEGER NOT NULL, 
        put_open_interest INTEGER NOT NULL,
        call_put_ratio REAL NOT NULL,
        UNIQUE(symbol, timestamp)
      )
    `,
    
    MOVING_AVERAGES: `
      CREATE TABLE IF NOT EXISTS moving_averages (
        symbol TEXT PRIMARY KEY,
        ma10 REAL,
        ma50 REAL,
        ma100 REAL,
        ma200 REAL,
        last_updated INTEGER NOT NULL
      )
    `,
    
    INDEXES: `
      CREATE INDEX IF NOT EXISTS idx_option_volume_symbol_time 
      ON option_volume_history(symbol, timestamp)
    `
  };

  // Private constructor for singleton pattern
  private constructor() {
    // Database will be opened in initialize()
  }

  // Get singleton instance
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Initialize the database
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Open the database using the async method
      this.database = await SQLite.openDatabaseAsync('stockwatcher.db');
      
      // Create tables if they don't exist
      await this.database.execAsync(this.DB_SCHEMA.OPTION_VOLUME_HISTORY);
      await this.database.execAsync(this.DB_SCHEMA.MOVING_AVERAGES);
      await this.database.execAsync(this.DB_SCHEMA.INDEXES);
      
      // Mark as initialized before calling purgeOldData
      this.initialized = true;
      console.log('Database initialized successfully');
      
      // Set up scheduled purge of old data (keep only 7 days)
      // Do this after marking initialization as complete
      await this.purgeOldData();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  
  // Execute SQL with proper error handling
  private async executeSql(sqlStatement: string, params: any[] = []): Promise<SQLiteResult> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    try {
      // For parameterized queries, we need to use different methods
      if (params.length > 0) {
        // For queries with parameters, use the runAsync method that supports parameters
        const result = await this.database.runAsync(sqlStatement, params);
        return {
          rows: {
            length: 0,
            item: () => undefined,
            _array: []
          },
          rowsAffected: result?.changes || 0,
          insertId: result?.lastInsertRowId
        };
      } else {
        // For statements without parameters, use execAsync
        await this.database.execAsync(sqlStatement);
        return {
          rows: {
            length: 0,
            item: () => undefined,
            _array: []
          },
          rowsAffected: 0
        };
      }
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  }
  
  // Execute multiple SQL statements in a transaction
  private async executeTransaction(sqlStatements: { sql: string, args: any[] }[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Execute each statement sequentially
      for (const statement of sqlStatements) {
        await this.executeSql(statement.sql, statement.args);
      }
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  // Save options volume data (time series data)
  public async saveOptionsVolumeData(data: OptionsVolumeData): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const query = `
        INSERT OR REPLACE INTO option_volume_history 
        (symbol, timestamp, call_volume, put_volume, call_open_interest, put_open_interest, call_put_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.executeSql(query, [
        data.symbol,
        data.timestamp,
        data.callVolume,
        data.putVolume,
        data.callOpenInterest,
        data.putOpenInterest,
        data.callPutRatio
      ]);
    } catch (error) {
      console.error(`Error saving options volume data for ${data.symbol}:`, error);
      throw error;
    }
  }

  // Batch save options volume data
  public async saveOptionsVolumeBatch(dataArray: OptionsVolumeData[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (dataArray.length === 0) {
      return;
    }
    
    try {
      // Prepare statements for batch execution
      const sqlStatements = dataArray.map(data => {
        const query = `
          INSERT OR REPLACE INTO option_volume_history 
          (symbol, timestamp, call_volume, put_volume, call_open_interest, put_open_interest, call_put_ratio)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        return {
          sql: query,
          args: [
            data.symbol,
            data.timestamp,
            data.callVolume,
            data.putVolume,
            data.callOpenInterest,
            data.putOpenInterest,
            data.callPutRatio
          ]
        };
      });
      
      // Execute all statements in a transaction
      await this.executeTransaction(sqlStatements);
      console.log(`Successfully saved batch of ${dataArray.length} records`);
    } catch (error) {
      console.error('Error batch saving options volume data:', error);
      throw error;
    }
  }

  // Get options volume history for a symbol within a time range
  public async getOptionsVolumeHistory(
    symbol: string, 
    startTime?: number, 
    endTime?: number
  ): Promise<OptionsVolumeData[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      let query = `
        SELECT symbol, timestamp, call_volume, put_volume, 
               call_open_interest, put_open_interest, call_put_ratio
        FROM option_volume_history
        WHERE symbol = ?
      `;
      
      const params: any[] = [symbol];
      
      if (startTime) {
        query += ' AND timestamp >= ?';
        params.push(startTime);
      }
      
      if (endTime) {
        query += ' AND timestamp <= ?';
        params.push(endTime);
      }
      
      query += ' ORDER BY timestamp ASC';
      
      // Use getAllAsync for SELECT queries to get rows
      const results = this.database ? await this.database.getAllAsync(query, params) : [];
      
      return results.map((row: any) => ({
        symbol: row.symbol,
        date: new Date(row.timestamp).toISOString().split('T')[0],
        callVolume: row.call_volume,
        putVolume: row.put_volume,
        callOpenInterest: row.call_open_interest,
        putOpenInterest: row.put_open_interest,
        callPutRatio: row.call_put_ratio,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error(`Error getting options volume history for ${symbol}:`, error);
      return [];
    }
  }

  // Save moving average data
  public async saveMovingAverages(data: MovingAverageData): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const query = `
        INSERT OR REPLACE INTO moving_averages 
        (symbol, ma10, ma50, ma100, ma200, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.executeSql(query, [
        data.symbol,
        data.ma10,
        data.ma50,
        data.ma100,
        data.ma200,
        data.lastUpdated
      ]);
    } catch (error) {
      console.error(`Error saving moving averages for ${data.symbol}:`, error);
      throw error;
    }
  }

  // Get moving averages for a symbol
  public async getMovingAverages(symbol: string): Promise<MovingAverageData | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const query = `
        SELECT symbol, ma10, ma50, ma100, ma200, last_updated
        FROM moving_averages
        WHERE symbol = ?
      `;
      
      // Use getAllAsync for SELECT queries
      const results = this.database ? await this.database.getAllAsync(query, [symbol]) : [];
      
      if (results.length > 0) {
        const row: any = results[0];
        return {
          symbol: row.symbol,
          ma10: row.ma10,
          ma50: row.ma50,
          ma100: row.ma100,
          ma200: row.ma200,
          lastUpdated: row.last_updated
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting moving averages for ${symbol}:`, error);
      return null;
    }
  }

  // Purge data older than 7 days
  public async purgeOldData(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Calculate timestamp for 7 days ago
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const query = `
        DELETE FROM option_volume_history
        WHERE timestamp < ?
      `;
      
      await this.executeSql(query, [sevenDaysAgo]);
      console.log('Purged options volume data older than 7 days');
    } catch (error) {
      console.error('Error purging old data:', error);
    }
  }
}

// Export a singleton instance
export const dbService = DatabaseService.getInstance();
