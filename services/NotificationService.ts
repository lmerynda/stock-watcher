import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { dbService } from './DatabaseService';
import { OptionsVolumeData } from './providers/OptionsVolumeProvider';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // Request permissions
  public static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('options-alerts', {
        name: 'Options Volume Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  // Check for volume alert conditions
  public static async checkVolumeAlerts(symbol: string): Promise<void> {
    try {
      // Get recent data (last hour)
      const endTime = Date.now();
      const startTime = endTime - (60 * 60 * 1000); // 1 hour ago
      
      const recentData = await dbService.getOptionsVolumeHistory(symbol, startTime, endTime);
      
      if (recentData.length >= 2) {
        // Check for alert conditions
        const shouldAlert = this.checkAlertCondition(recentData);
        
        if (shouldAlert) {
          await this.sendVolumeAlert(symbol, recentData[recentData.length - 1]);
        }
      }
    } catch (error) {
      console.error(`Error checking volume alerts for ${symbol}:`, error);
    }
  }

  // Your custom algorithm to determine when to alert
  // This is a simple example - you would replace with your own logic
  private static checkAlertCondition(data: OptionsVolumeData[]): boolean {
    if (data.length < 2) return false;
    
    // Get the most recent and previous data points
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    // Calculate percent change in call/put ratio
    const percentChange = ((latest.callPutRatio - previous.callPutRatio) / previous.callPutRatio) * 100;
    
    // Alert if ratio changed by more than 50%
    if (Math.abs(percentChange) > 50) {
      return true;
    }
    
    // Alert if very high call/put ratio (bullish signal)
    if (latest.callPutRatio > 3.0 && previous.callPutRatio < 3.0) {
      return true;
    }
    
    // Alert if very low call/put ratio (bearish signal)
    if (latest.callPutRatio < 0.5 && previous.callPutRatio > 0.5) {
      return true;
    }
    
    // Check for significant volume increase (>100% increase in total volume)
    const latestTotalVolume = latest.callVolume + latest.putVolume;
    const previousTotalVolume = previous.callVolume + previous.putVolume;
    const volumePercentChange = ((latestTotalVolume - previousTotalVolume) / previousTotalVolume) * 100;
    
    if (volumePercentChange > 100) {
      return true;
    }
    
    return false;
  }

  // Send notification
  private static async sendVolumeAlert(symbol: string, data: OptionsVolumeData): Promise<void> {
    let alertTitle = `Options Alert: ${symbol}`;
    let alertBody = '';
    
    // Determine alert type based on the data
    if (data.callPutRatio > 3.0) {
      alertBody = `Strong bullish signal detected! Call/Put ratio: ${data.callPutRatio.toFixed(2)}`;
    } else if (data.callPutRatio < 0.5) {
      alertBody = `Strong bearish signal detected! Call/Put ratio: ${data.callPutRatio.toFixed(2)}`;
    } else {
      alertBody = `Unusual options activity detected! Call/Put ratio: ${data.callPutRatio.toFixed(2)}`;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alertTitle,
        body: alertBody,
        data: { symbol, timestamp: data.timestamp }
      },
      trigger: null // Send immediately
    });
    
    console.log(`Alert sent for ${symbol}: ${alertBody}`);
  }
}
