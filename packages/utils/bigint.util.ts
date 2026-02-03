export default {
  // 一元数组的处理
  /**
   * 去除数组中重复元素，返回去重后的新数组
   *
   * @param arr 要去重的数组
   * @returns 返回去重后的新数组
   */
  add(num1: bigint | number, num2: bigint | number): bigint {
    let add1, add2;
    if (typeof num1 === 'bigint') {
      add1 = this.parseToInt(num1);
    } else {
      add1 = num1;
    }
    if (typeof num2 === 'bigint') {
      add2 = this.parseToInt(num2);
    } else {
      add2 = num2;
    }
    return BigInt(add1 + add2);
  },

  des(num1: bigint | number, num2: bigint | number): bigint {
    let des1, des2;
    if (typeof num1 === 'bigint') {
      des1 = this.parseToInt(num1);
    } else {
      des1 = num1;
    }
    if (typeof num2 === 'bigint') {
      des2 = this.parseToInt(num2);
    } else {
      des2 = num2;
    }
    return BigInt(des1 - des2);
  },

  parseToInt(num: bigint): number {
    let numb = parseInt(`${num}`);
    // if ( !numb ){
    //     numb = 0
    // }
    // if ( numb < 0 ){
    //     numb = 0
    // }
    return numb;
  },

  /**
   * 判断 num1 是否大于 num2
   *
   * @param num1 数值，可以是 bigint 或 number 类型
   * @param num2 数值，可以是 bigint 或 number 类型
   * @returns 返回一个布尔值，表示 num1 是否大于 num2
   */
  gt(num1: bigint | number, num2: bigint | number): boolean {
    let gt1, gt2;
    if (typeof num1 === 'bigint') {
      gt1 = this.parseToInt(num1);
    } else {
      gt1 = num1;
    }
    if (typeof num2 === 'bigint') {
      gt2 = this.parseToInt(num2);
    } else {
      gt2 = num2;
    }
    return gt1 > gt2;
  },

  serialize(obj: any, seen = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // 检查循环引用
    if (typeof obj === 'object' && seen.has(obj)) {
      return '[Circular]';
    }

    switch (typeof obj) {
      case 'bigint':
        return this.parseToInt(obj);
      case 'object':
        if (obj instanceof Date) {
          return obj;
        }

        // 将对象添加到已访问集合中
        if (Array.isArray(obj)) {
          seen.add(obj);
          const result = obj.map((value) => this.serialize(value, seen));
          seen.delete(obj);
          return result;
        }

        seen.add(obj);
        const result = Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key,
            this.serialize(value, seen),
          ]),
        );
        seen.delete(obj);
        return result;
      default:
        return obj;
    }
  },
};
