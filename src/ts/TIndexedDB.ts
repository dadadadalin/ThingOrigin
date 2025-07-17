import { merge, cloneDeep } from "lodash-es";
import { ThingOrigin } from "../ThingOrigin";

/**
 * 本地缓存
 */

export class TIndexedDB {
  public DBs: Map<string, IDBDatabase> = new Map<string, IDBDatabase>();

  // 0-10 存放字体

  constructor() {
    // console.log("TINde", ThingOrigin.sceneData);
  }

  /**
   * 判断是否已缓存此模型，返回是否存储，若已缓存返回模型参数
   * @author LL
   * @since 2022-07-14
   * @param {modelParams} modelInfo
   */
  public accessModel(modelInfo: modelInfoParams): PromiseLike<accessResult> {
    let request = window.indexedDB.open(
      ThingOrigin.sceneData.params.indexedDB.dataBaseName,
      1
    );
    let db: IDBDatabase;

    return new Promise((resolve) => {
      request.onerror = (event) => {
        console.log("数据库打开失败");
      };

      request.onsuccess = (event) => {
        db = request.result;

        if (
          !this.DBs.get(ThingOrigin.sceneData.params.indexedDB.dataBaseName)
        ) {
          this.DBs.set(ThingOrigin.sceneData.params.indexedDB.dataBaseName, db);
        }

        var transaction = db.transaction(
          ThingOrigin.sceneData.params.indexedDB.tableName,
          "readwrite"
        );
        var store = transaction.objectStore(
          ThingOrigin.sceneData.params.indexedDB.tableName
        );

        var dataRequest = store.index("id").get(modelInfo.id);

        dataRequest.onsuccess = (e: any) => {
          console.log("缓存结果", e);
          //@ts-ignore
          if (e.target.result != undefined) {
            let result = Object.assign(modelInfo, {
              saved: true,
            });

            let blobUrl = URL.createObjectURL(
              new Blob([e.target.result.model], {
                type: "application/octet-stream",
              })
            );

            resolve({
              info: result,
              modelUrl: blobUrl,
            });
          } else {
            resolve({ info: { saved: false } });
          }
        };
      };

      request.onupgradeneeded = (event) => {
        //@ts-ignore
        db = event.target.result;

        var objectStore;
        if (
          !db.objectStoreNames.contains(
            ThingOrigin.sceneData.params.indexedDB.tableName
          )
        ) {
          objectStore = db.createObjectStore(
            ThingOrigin.sceneData.params.indexedDB.tableName,
            { keyPath: "id" }
          );
          // 定义存储对象的数据项
          objectStore.createIndex("id", "id", { unique: true });
          objectStore.createIndex("name", "name");
          objectStore.createIndex("modelName", "modelName");
          objectStore.createIndex("model", "model");
          objectStore.createIndex("modelUrl", "modelUrl");
          objectStore.createIndex("modelSize", "modelSize");
          objectStore.createIndex("modelType", "modelType");
          objectStore.createIndex("loadType", "loadType");
          objectStore.createIndex("position", "position");
          objectStore.createIndex("scale", "scale");
          objectStore.createIndex("rotation", "rotation");
          objectStore.createIndex("dataBaseName", "dataBaseName");
          objectStore.createIndex("tableName", "tableName");
          objectStore.createIndex("userData", "userData");
        }
        console.log("数据库升级成功");
      };
    });
  }

  /**
   * 向indexedDB数据表中，存储模型
   * @author LL
   * @since 2022-07-14
   * @param {modelInfoParams} modelInfo
   */
  public insertModel(modelInfo: modelInfoParams): Promise<modelInfoParams> {
    return new Promise((resolve) => {
      var ajax = new XMLHttpRequest();

      let url =
        modelInfo.modelType == "text"
          ? modelInfo.base.fontUrl
          : modelInfo.base.modelUrl;

      ajax.open("get", url);
      ajax.responseType = "blob";
      ajax.send();
      ajax.onreadystatechange = () => {
        if (ajax.readyState == 4 && ajax.status == 200) {
          modelInfo = Object.assign(modelInfo, {
            // modelSize: ajax.responseText.length,
            // model: new Blob([ajax.responseText]),
            modelSize: ajax.response.size,
            model: new Blob([ajax.response]),
            dataBaseName: ThingOrigin.sceneData.params.indexedDB.dataBaseName,
            tableName: ThingOrigin.sceneData.params.indexedDB.tableName,
          });

          let db = this.DBs.get(
            ThingOrigin.sceneData.params.indexedDB.dataBaseName
          );

          let indexedTable = db
            .transaction(
              [ThingOrigin.sceneData.params.indexedDB.tableName],
              "readwrite"
            ) //新建事务，readwrite, readonly(默认), versionchange
            .objectStore(ThingOrigin.sceneData.params.indexedDB.tableName); //拿到IDBObjectStore 对象

          let info = cloneDeep(modelInfo);
          var request1 = indexedTable.add(info);
          request1.onsuccess = (event) => {
            console.log("数据写入成功", event);

            // try {
            let dataRequest2 = indexedTable.index("id").get(modelInfo.id);
            dataRequest2.onsuccess = (e2: any) => {
              let result = merge(modelInfo, {
                saved: true,
              });

              let blobUrl = window.URL.createObjectURL(e2.target.result.model);

              resolve({
                info: result,
                modelUrl: blobUrl,
              });
            };
          };
          request1.onerror = (event) => {
            console.log("数据写入失败");
          };
        }
        // else {
        //   console.warn("写入失败，请检查文件路径");
        //   resolve({ saved: false, url: undefined });
        // }
      };
    });
  }

  /**
   * 删除模型
   * @author LL
   * @since 2022-07-15
   * @param {number} id
   */
  public deleteModel(id: number): Promise<boolean> {
    let db = this.DBs.get(ThingOrigin.sceneData.params.indexedDB.dataBaseName);

    return new Promise((resolve) => {
      let request = db
        .transaction(
          [ThingOrigin.sceneData.params.indexedDB.tableName],
          "readwrite"
        ) //新建事务，readwrite, readonly(默认), versionchange
        .objectStore(ThingOrigin.sceneData.params.indexedDB.tableName) //拿到IDBObjectStore 对象、
        .delete(id);

      request.onsuccess = (event) => {
        console.log("数据删除成功");
        resolve(true);
      };
      request.onerror = (event) => {
        console.log("数据写入失败");
        resolve(false);
      };
    });
  }

  /**
   * 更新模型
   * @author LL
   * @since 2022-07-15
   * @param {updateInfoParams} info 更新模型参数
   */
  public updateModel(info: updateInfoParams): Promise<void> {
    if (!info.modelInfo.id) {
      console.warn("请传入id");
      return;
    }

    return new Promise((resolve, reject) => {
      const dbName = ThingOrigin.sceneData.params.indexedDB.dataBaseName;
      const tableName = ThingOrigin.sceneData.params.indexedDB.tableName;

      const request = window.indexedDB.open(dbName);

      request.onerror = (event) => {
        console.error("Database open failed:", event);
        reject(new Error("Database open failed"));
      };

      request.onsuccess = (event) => {
        const db: IDBDatabase = request.result;

        if (!this.DBs.has(dbName)) {
          this.DBs.set(dbName, db);
        }

        const transaction = db.transaction(tableName, "readwrite");
        const store = transaction.objectStore(tableName);

        transaction.onerror = (event) => {
          console.error("Transaction error:", event);
          reject(new Error("Transaction failed"));
        };

        const getRequest = store.index("id").get(info.modelInfo.id);

        getRequest.onsuccess = () => {
          const existingData = getRequest.result;
          const updatedData = { ...existingData, ...info.modelInfo };

          const putRequest = store.put(updatedData);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = (event) => {
            console.error("Data update failed:", event);
            reject(new Error("Data update failed"));
          };
        };

        getRequest.onerror = (event) => {
          console.error("Data retrieval failed:", event);
          reject(new Error("Data retrieval failed"));
        };
      };
    });
  }

  /**
   * 查询并缓存模型
   * @author LL
   * @since 2025/01/09
   * @param {modelInfoParams} modelInfo
   */
  public async accessInsertModel(
    modelInfo: modelInfoParams
  ): Promise<accessInsetResult> {
    const accessRes = await this.accessModel(modelInfo);
    return new Promise(async (resolve, reject) => {
      //如果缓存了   直接导入
      if (accessRes.info.saved) {
        resolve({
          saved: true,
          inserted: false,
          modelUrl: accessRes.modelUrl,
        });
      } else {
        const insertRes = await this.insertModel(modelInfo);
        if (insertRes.info.saved) {
          resolve({
            saved: true,
            inserted: true,
            modelUrl: insertRes.modelUrl,
          });
        } else {
          resolve({
            saved: false,
            inserted: false,
          });
        }
      }
    });
  }

  /**
   * 加载indexedDB模型  未缓存的缓存后加载，缓存的直接加载
   * @author LL
   * @since 2025/01/07
   * @param {modelInfoParams} modelInfo
   */
  public async getIDBModelInfo(modelInfo: modelInfoParams): Promise<any> {
    let accessInsetResult = await this.accessInsertModel(modelInfo);

    let cloneInfo = cloneDeep(modelInfo);
    cloneInfo.base.modelUrl = accessInsetResult.modelUrl;

    return cloneInfo;
  }
}
