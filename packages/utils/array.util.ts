import validate from './validate.util';
import timer from './timer.util';
import objectUtil from './object.util';
import { findIndex } from 'lodash';

export interface MultiMensionArray {
  [key: string]: any;
}

export default {
  /**
   * 根据指定条件过滤数组元素。
   * @param array 要过滤的数组，可能为null。
   * @param conditions 过滤条件，键值对形式。
   * @param defaultValue 如果对象中没有找到指定的键，则使用此默认值进行比较。
   * @returns 返回过滤后的数组，如果输入数组为null，则返回null。
   */
  filter(
    array: MultiMensionArray[] | null,
    conditions: { [key: string]: any },
    defaultValue: any = '',
  ): MultiMensionArray[] | null {
    if (!array) return null; // 如果输入数组为null，则直接返回null
    return array.filter((item) =>
      // 对每个元素进行条件过滤，只有满足所有条件的元素才会被保留
      Object.entries(conditions).every(
        ([key, value]) =>
          objectUtil.getValue(item, key, defaultValue) === value,
      ),
    );
  },
  /**
   * 在数组中查找符合条件的第一个元素。
   * @param array 要搜索的数组，可以为null。
   * @param conditions 查找条件，以键值对的形式给出。
   * @param defaultValue 如果在对象中找不到指定的键，则使用此默认值进行比较。
   * @returns 返回找到的元素，如果没有找到或数组为null，则返回null。
   */
  findOne(
    array: any[] | any | null,
    conditions: { [key: string]: any },
    defaultValue: any = '',
  ): any | null {
    // console.log('techwu findOne' , array ,conditions )
    // 如果数组不为null，则开始查找
    return array
      ? array.find((item: any) => {
          // 对于每个元素，检查是否所有条件都满足
          return Object.keys(conditions).every((key) => {
            // 使用objectUtil.getValue获取元素的属性值，并与条件进行比较
            return (
              objectUtil.getValue(item, key, defaultValue) === conditions[key]
            );
          });
        })
      : null; // 如果数组为null，则直接返回null
  },

  filterAfterTimes(
    array: MultiMensionArray[],
    timestamp: number = 0,
    defaultValue: number = 0,
  ): MultiMensionArray[] {
    return array.filter((item) => {
      return objectUtil.getValue(item, 'timestamp', defaultValue) >= timestamp;
    });
  },

  filterInValues(
    array: MultiMensionArray[],
    conditions: { [key: string]: any[] },
    defaultValue: any = '',
  ): MultiMensionArray[] {
    return array.filter((item) => {
      return Object.entries(conditions).every(([field, inValues]) => {
        return inValues.includes(
          objectUtil.getValue(item, field, defaultValue),
        );
      });
    });
  },

  filterNotInValues(
    array: MultiMensionArray[],
    field: string,
    inValues: any[],
    defaultValue: any = '',
  ): MultiMensionArray[] {
    return array.filter((item) => {
      return !inValues.includes(objectUtil.getValue(item, field, defaultValue));
    });
  },

  checkExists(
    array: MultiMensionArray[],
    field: string,
    valueToCheck: any,
    defaultValue: any = '',
  ): boolean {
    return array.some((item) => {
      return objectUtil.getValue(item, field, defaultValue) === valueToCheck;
    });
  },

  removeItem(
    array: MultiMensionArray[],
    field: string,
    valueToCheck: any,
    defaultValue: any = '',
  ): MultiMensionArray[] {
    const indexToRemove = array.findIndex((item) => {
      return objectUtil.getValue(item, field, defaultValue) === valueToCheck;
    });

    if (indexToRemove !== -1) {
      array.splice(indexToRemove, 1);
    }

    return array;
  },

  // 获取数组的某个字段形成新的数组
  getMapFieldValues(
    originalArray: MultiMensionArray[] | null,
    fieldName: string = 'id',
    defaultValue: any = 0,
  ): any[] {
    if (!originalArray || originalArray.length === 0) {
      return [];
    }
    return originalArray.map((item) => {
      return objectUtil.getValue(item, fieldName, defaultValue);
    });
  },

  /**
   * 根据指定字段比较两个数组，返回不同的元素。
   * 如果merge为true，则合并两个数组中独有的元素；否则只返回第一个数组中独有的元素。
   * @param array1 第一个数组
   * @param array2 第二个数组
   * @param field 比较的字段，默认为'id'
   * @param merge 是否合并两个数组独有的元素，默认为true
   * @param defaultValue 字段不存在时的默认值，默认为0
   * @returns 返回两个数组中不同的元素组成的数组
   */
  diffByField(
    array1: MultiMensionArray[],
    array2: MultiMensionArray[],
    field: string = 'id',
    merge: boolean = true,
    defaultValue: any = 0,
  ): MultiMensionArray[] {
    // 将第二个数组的指定字段值转换为Set集合，便于快速查找
    const array2FieldValues = new Set(
      array2.map((item) => objectUtil.getValue(item, field, defaultValue)),
    );
    // 筛选出第一个数组中独有的元素
    let uniqueInArray1 = array1.filter(
      (item1) =>
        !array2FieldValues.has(objectUtil.getValue(item1, field, defaultValue)),
    );

    if (merge) {
      // 如果需要合并，同样处理第一个数组，然后合并两个结果
      const array1FieldValues = new Set(
        array1.map((item) => objectUtil.getValue(item, field, defaultValue)),
      );
      const uniqueInArray2 = array2.filter(
        (item2) =>
          !array1FieldValues.has(
            objectUtil.getValue(item2, field, defaultValue),
          ),
      );
      // 合并两个数组中独有的元素
      uniqueInArray1 = uniqueInArray1.concat(uniqueInArray2);
    }

    return uniqueInArray1;
  },

  /**
   * 合并两个数组，并可选地进行去重和排序。
   * @param arr1 第一个数组
   * @param arr2 第二个数组
   * @param uniqueField 用于去重的字段名，如果为空，则不进行去重
   * @param orderby 可选，指定排序的字段和方向
   * @returns 合并（并可能去重和排序）后的数组
   */
  combine(
    arr1: any[],
    arr2: any[],
    uniqueField: string = '',
    orderby?: { sort: string; asc: 'asc' | 'desc' },
  ): any[] {
    // 合并两个数组
    let combinedArray = [...(arr1 || []), ...(arr2 || [])];
    // 如果指定了用于去重的字段，则调用unique方法进行去重
    if (uniqueField) {
      combinedArray = this.unique(combinedArray, uniqueField);
    }
    // 如果提供了排序参数，则调用sort方法进行排序
    if (orderby && validate.isNotBlank(orderby)) {
      combinedArray = this.sort(combinedArray, orderby.sort, orderby.asc);
    }
    return combinedArray;
  },

  /**
   * 根据字段值查找数组中元素的索引。
   * 如果找到匹配的元素，返回其在数组中的索引；否则返回-1。
   * @param messagesArray 要搜索的数组
   * @param field 用于匹配的字段名
   * @param fieldValue 要匹配的字段值
   * @returns 匹配元素的索引，如果未找到则返回-1
   */
  findIndex(
    messagesArray: MultiMensionArray[],
    field: string,
    fieldValue: any,
  ): number {
    return messagesArray.findIndex((item) => item[field] === fieldValue);
  },

  /**
   * 根据指定字段对数组进行去重。
   * 如果uniqueField不为空，则根据该字段进行去重。
   * 否则，返回原数组。
   * @param arr 要去重的数组
   * @param uniqueField 用于去重比较的字段
   * @param defaultValue 如果字段不存在时使用的默认值
   * @returns 去重后的数组
   */
  unique(
    arr: any[],
    uniqueField: string = '',
    defaultValue: string = '',
  ): any[] {
    if (typeof arr[0] !== 'object') {
      // 如果arr[0]不是对象，则返回原数组
      return arr;
    }
    // 检查是否指定了用于去重的字段
    if (validate.isNotBlank(uniqueField)) {
      // 使用reduce方法进行去重
      arr = arr.reduce((acc, current) => {
        // 查找累加器中是否已存在当前元素
        const x = acc.find(
          (item: any) =>
            // 使用objectUtil工具获取元素的字段值，进行比较
            objectUtil.getValue(item, uniqueField, defaultValue) ===
            objectUtil.getValue(current, uniqueField, defaultValue),
        );
        // 如果不存在，则将当前元素添加到累加器中
        if (!x) {
          return acc.concat([current]);
        } else {
          // 如果已存在，继续使用当前累加器
          return acc;
        }
      }, []);
    }
    // 返回处理后的数组
    return arr;
  },

  // 判断元素是否已经存在于数组中
  isDuplicate(
    element: MultiMensionArray,
    array: MultiMensionArray[],
    field: string,
    defaultValue: any = '',
  ): boolean {
    for (let j = 0; j < array.length; j++) {
      let valueInElement = objectUtil.getValue(element, field, defaultValue);
      let valueInArray = objectUtil.getValue(array[j], field, defaultValue);
      if (valueInElement === valueInArray) {
        return true;
      }
    }
    return false;
  },

  /**
   * 数组排序函数
   * @param array 要排序的数组
   * @param sort 排序依据的字段，默认为'timestamp'
   * @param asc 排序方向，'asc'表示升序，'desc'表示降序，默认为'asc'
   * @param defaultValue 当数组元素中不存在sort字段时使用的默认值，默认为0
   * @returns 返回排序后的数组
   */
  sort(
    array: any[],
    sort: string = 'timestamp',
    asc: 'asc' | 'desc' = 'asc',
    defaultValue: any = 0,
  ): any[] {
    // 判断排序方向是否为升序
    const ascBoolean = asc === 'asc';
    // 使用sort方法对数组进行排序
    return array.sort((a, b) => {
      // 获取比较元素的值，如果不存在则使用默认值
      const valueA = objectUtil.getValue(a, sort, defaultValue);
      const valueB = objectUtil.getValue(b, sort, defaultValue);
      // 初始化比较结果
      let comparison = 0;

      // 如果比较的值为Date类型，则比较它们的时间戳
      if (valueA instanceof Date && valueB instanceof Date) {
        comparison = valueA.getTime() - valueB.getTime();
      } else {
        // 否则直接比较数值
        comparison = valueA - valueB;
      }

      // 如果排序方向为降序，反转比较结果
      if (asc === 'desc' || ascBoolean === false) {
        comparison = comparison * -1;
      }

      // 返回比较结果，用于sort方法排序
      return comparison;
    });
  },

  /**
   * 从数组中排除具有指定字段值的元素
   * @param arr 要处理的数组
   * @param field 用于比较的字段名
   * @param value 要排除的值
   * @returns 返回一个新数组，其中不包含具有指定字段值的元素
   */
  exclude(arr: any[], field: string, value: any): any[] {
    return arr.filter((item) => objectUtil.getValue(item, field, '') !== value);
  },
};
