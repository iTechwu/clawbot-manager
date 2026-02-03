import * as moment from 'moment-timezone';
export default {
  timestampToTimes(timestamp: number): string {
    let date = new Date(timestamp); //时间戳为10位需*1000，时间戳为13位的话不需乘1000
    let Y = date.getFullYear() + '-';
    let M =
      (date.getMonth() + 1 < 10
        ? '0' + (date.getMonth() + 1)
        : date.getMonth() + 1) + '-';
    let D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';

    return Y + M + D;
  },

  getCurrentDateFormatted(): string {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 注意月份是从0开始的，所以需要+1
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  },

  getCurrentDateTimeFormatted(formatDay?: boolean): string {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 注意月份是从0开始的
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    if (formatDay) {
      return `${year}${month}${day}`;
    }
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0'); // 添加秒数
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  },

  checkTimeWithNow(dateString: string): number {
    // 获取当前时间的日期对象和时间戳
    let currentTimestamp = this.getCurrentTimestamp();

    // 提取年、月、日、时、分、秒的部分
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1; // 月份是从 0 开始的，所以要减去 1
    const day = parseInt(dateString.substring(6, 8), 10);
    const hour = parseInt(dateString.substring(8, 10), 10);
    const minute = parseInt(dateString.substring(10, 12), 10);
    const second = parseInt(dateString.substring(12, 14), 10);

    // 创建日期对象并获取时间戳
    const dateObject = new Date(year, month, day, hour, minute, second);
    const dateTimestamp = dateObject.getTime();

    // 比较时间戳
    if (dateTimestamp > currentTimestamp) {
      return 1;
    } else if (dateTimestamp < currentTimestamp) {
      return -1;
    } else {
      return 0;
    }
  },

  getCurrentTimestamp(): number {
    const currentDate = new Date();
    return currentDate.getTime();
  },

  checkTimeExpire(expireAt?: Date): boolean {
    if (!expireAt) {
      return false;
    }
    if (expireAt < new Date()) {
      return true;
    }
    return false;
  },

  dateTime(e: number): string {
    let old = new Date(e);
    let now = new Date();
    //获取old具体时间
    let d = old.getTime();
    let h = old.getHours();
    let m = old.getMinutes();
    let Y = old.getFullYear();
    let M = old.getMonth() + 1;
    let D = old.getDate();
    //获取now具体时间
    let nd = now.getTime();
    let nh = now.getHours();
    let n = now.getMinutes();
    let nY = now.getFullYear();
    let nM = now.getMonth() + 1;
    let nD = now.getDate();

    //当天的时间
    if (D === nD && M === nM && Y === nY) {
      if (h < 10) {
        h = parseInt('0' + h);
      }
      if (m < 10) {
        m = parseInt('0' + m);
      }
      return h + ':' + m;
    }
    //昨天时间
    if (D + 1 === nD && M === nM && Y === nY) {
      if (h < 10) {
        h = parseInt('0' + h);
      }
      if (m < 10) {
        m = parseInt('0' + m);
      }
      return '昨天 ' + h + ':' + m;
    } else {
      //大于两天
      return Y + '/' + M + '/' + D;
    }
  },

  spaceTime(old: number, now: number): string {
    old = new Date(old).getTime();
    now = new Date(now).getTime();
    if (old > now + 1000 * 60 * 5) {
      return new Date(now).toString();
    } else {
      return '';
    }
  },

  timeago(dateTime: number): string {
    var dateTimeStamp = new Date(dateTime).getTime();
    let result;
    let minute = 1000 * 60; //把分，时，天，周，半个月，一个月用毫秒表示
    let hour = minute * 60;
    let day = hour * 24;
    let week = day * 7;
    let halfamonth = day * 15;
    let month = day * 30;
    let now = new Date().getTime(); //获取当前时间毫秒
    let diffValue = now - dateTimeStamp; //时间差
    if (diffValue < 0) {
      return '';
    }
    let minC = diffValue / minute; //计算时间差的分，时，天，周，月
    let hourC = diffValue / hour;
    let dayC = diffValue / day;
    let weekC = diffValue / week;
    let monthC = diffValue / month;
    if (minC >= 1 && minC < 60) {
      result = ' ' + parseInt(minC.toString()) + '分钟前';
    } else if (diffValue >= 0 && diffValue <= minute) {
      result = '刚刚';
    } else {
      result = this.formatDate(dateTime);
    }
    return result;
  },

  formatTime(time: number): string {
    const second = 1000;
    const minute = second * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const now = new Date().getTime();
    const diffValue = now - time;

    // 计算差异时间的量级
    const secondC = diffValue / second;
    const minC = diffValue / minute;
    const hourC = diffValue / hour;
    const dayC = diffValue / day;

    if (dayC >= 1) {
      return parseInt(dayC.toString()) + '天';
    } else if (hourC >= 1) {
      return parseInt(hourC.toString()) + '小时';
    } else if (minC >= 1) {
      return parseInt(minC.toString()) + '分钟';
    } else {
      return '刚刚';
    }
  },

  formatDate(t: number): string {
    t = t || Date.now();
    let time = new Date(t);
    let nowtime = new Date();
    let str = '';
    if (
      time.getMonth() != nowtime.getMonth() ||
      time.getDate() != nowtime.getDate()
    ) {
      str +=
        time.getMonth() < 9 ? '0' + (time.getMonth() + 1) : time.getMonth() + 1;
      str += '-';
      str += time.getDate() < 10 ? '0' + time.getDate() : time.getDate();
      str += ' ';
    }
    str += time.getHours();
    str += ':';
    str += time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes();
    return str;
  },

  utcTimeToTargetTime(utcTime: Date, targetTimezone: string, format?: string) {
    return moment.tz(utcTime, 'UTC').tz(targetTimezone).format(format);
  },
};
