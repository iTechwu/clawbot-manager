import validate from './validate.util';
import jsonUtil from './json.util';
import { pick } from 'lodash';

type NestedObject = {
  [key: string]: NestedObject | {};
};
export default {
  filter(object: any, fields: string[]) {
    return pick(object, fields);
  },
  getType(data: any): string {
    if (Array.isArray(data)) return 'array';
    if (data === null) return 'null';
    return typeof data;
  },
  isCustomType(object: any, constructorName: string): boolean {
    return (
      object &&
      typeof object === 'object' &&
      typeof object.constructor === 'function' &&
      object.constructor.name === constructorName
    );
  },
  getValue(data: any, name: string, defaultValue: any = null): any {
    let objData =
      typeof data === 'string' ? jsonUtil.parse(data, defaultValue) : data;
    if (this.getType(name) !== 'string') return defaultValue;
    if (this.getType(objData) !== 'object' || objData === null)
      return defaultValue;

    if (name.includes('.')) {
      return name.split('.').reduce((acc, key) => {
        return acc !== defaultValue
          ? this.getValue(acc, key, defaultValue)
          : defaultValue;
      }, objData);
    } else {
      return objData.hasOwnProperty(name) && validate.isNotBlank(objData[name])
        ? objData[name]
        : defaultValue;
    }
  },
  addProperty(obj: any, key: string, value: any): any {
    const addObj: any = {};
    addObj[key] = value;
    if (!this.isCustomType(obj, 'Object')) {
      obj = {};
    }
    obj = {
      ...obj,
      ...addObj,
    };
    return obj;
  },
  removeProperty(obj: any, key: string): any {
    if (!obj?.hasOwnProperty(key)) {
      return obj;
    }
    // 使用扩展运算符创建新对象，并排除指定的 key
    const { [key]: omitted, ...newObj } = obj;
    return newObj;
  },
  removePropertys(obj: any, keys: string[]): any {
    return keys.reduce((acc, key) => this.removeProperty(acc, key), obj);
  },
  // 数组的项目是Object的处理
  addPropertyInArray(array: any[], key: string, value: any): any[] {
    return array
      .filter((item) => this.isCustomType(item, 'Object'))
      .map((item) => this.addProperty(item, key, value));
  },
  removePropertysInArray(array: any[], keys: string[]): any[] {
    return array.map((item) => this.removePropertys(item, keys));
  },
  setNestedValue(obj: any, path: string, value: any): void {
    // 将字符串路径转换为路径数组
    const pathArray = path.split('.');

    // 确保路径数组不为空
    if (pathArray.length === 0) {
      throw new Error('Path cannot be an empty string.');
    }

    // 遍历路径数组，除了最后一个元素
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];

      // 如果当前层的字段不存在，则创建它（假设它是一个对象）
      if (!obj.hasOwnProperty(key) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }

      // 向下遍历到下一层对象
      obj = obj[key];
    }
    // 设置最后一个字段的值
    const lastKey = pathArray[pathArray.length - 1];
    obj[lastKey] = value;
  },

  traverseKeys(obj: NestedObject | any, parentKeys: string[] = []): string[][] {
    const keyPaths: string[][] = [];

    // 遍历对象的每一个属性
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // 构建当前键的完整路径
        const currentKeys = [...parentKeys, key];

        // 添加到key路径数组中
        keyPaths.push(currentKeys);

        // 如果值是对象，则递归遍历
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // 递归调用并合并返回的key路径
          keyPaths.push(...this.traverseKeys(obj[key], currentKeys));
        }
      }
    }

    return keyPaths;
  },
  isEqual(object1: any, object2: any): boolean {
    if (object1 === object2) {
      return true;
    }
    if (!object1 || !object2) {
      return false;
    }
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (const key of keys1) {
      const val1 = object1[key];
      const val2 = object2[key];
      if (typeof val1 === 'object' && typeof val2 === 'object') {
        if (!this.isEqual(val1, val2)) {
          return false;
        }
      } else if (val1 !== val2) {
        return false;
      }
    }
    return true;
  },
};
