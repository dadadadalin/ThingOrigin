export class TIndexedDB {
  public DBs: Map<string, IDBDatabase> = new Map<string, IDBDatabase>();

  /**
   * @description 判断是否已缓存此模型，返回是否存储，若已缓存返回模型参数
   * @author LL
   * @date 2022-07-14
   * @param {string} dataBaseName
   * @param {string} tableName
   * @param {IDBParams} modelInfo
   * @returns {*}  {Promise<object>}
   */
  public accessModel(
    dataBaseName: string,
    tableName: string,
    modelInfo: IDBParams
  ): Promise<modelResultParams> {
    let request = window.indexedDB.open(dataBaseName, 1);
    let db: IDBDatabase;

    return new Promise((resolve) => {
      request.onerror = (event) => {
        console.log("数据库打开失败");
      };

      request.onsuccess = (event) => {
        console.log("数据库打开成功");
        db = request.result;

        if (!this.DBs.get(dataBaseName)) {
          this.DBs.set(dataBaseName, db);
        }

        var transaction = db.transaction(tableName, "readwrite");
        var store = transaction.objectStore(tableName);
        var dataRequest = store.index("id").get(modelInfo.id);

        dataRequest.onsuccess = (e) => {
          console.log("结果", e);
          //@ts-ignore
          if (e.target.result != undefined) {
            //创建blob对象路径。​
            //@ts-ignore
            let url = URL.createObjectURL(e.target.result.model);
            //@ts-ignore
            let modelSize = e.target.result.modelSize;
            //@ts-ignore
            let scale = e.target.result.scale;
            //@ts-ignore
            let type = e.target.result.type;
            //@ts-ignore
            let loadType = e.target.result.loadType;
            //@ts-ignore
            let name = e.target.result.name;
            //@ts-ignore
            let position = e.target.result.position;
            //@ts-ignore
            let rotation = e.target.result.rotation;
            //@ts-ignore
            let userData = e.target.result.userData;
            //@ts-ignore
            let modelName = e.target.result.modelName;

            resolve({
              saved: true,
              name: name,
              modelName: modelName,
              url: url,
              modelSize: modelSize,
              type: type,
              loadType: loadType,
              scale: scale,
              position: position,
              rotation: rotation,
              userData: userData,
            });
          } else {
            resolve({ saved: false });
          }
        };
      };

      request.onupgradeneeded = (event) => {
        //@ts-ignore
        db = event.target.result;

        var objectStore;
        if (!db.objectStoreNames.contains(tableName)) {
          objectStore = db.createObjectStore(tableName, { keyPath: "id" });
          // 定义存储对象的数据项
          objectStore.createIndex("id", "id", { unique: true });
          objectStore.createIndex("name", "name");
          objectStore.createIndex("modelName", "modelName");
          objectStore.createIndex("model", "model");
          objectStore.createIndex("url", "url");
          objectStore.createIndex("modelSize", "modelSize");
          objectStore.createIndex("type", "type");
          objectStore.createIndex("loadType", "loadType");
          objectStore.createIndex("position", "position");
          objectStore.createIndex("scale", "scale");
          objectStore.createIndex("rotation", "rotation");
          objectStore.createIndex("userData", "userData");
        }
        console.log("数据库升级成功");
      };
    });
  }

  /**
   * @description 向indexedDB数据表中，存储模型
   * @author LL
   * @date 2022-07-14
   * @param {string} dataBaseName
   * @param {string} tableName
   * @param {modelInfoParams} modelInfo
   * @returns {*}  {Promise<object>}
   */
  public insertModel(
    dataBaseName: string,
    tableName: string,
    modelInfo: IDBParams
  ): Promise<modelResultParams> {
    return new Promise((resolve) => {
      var ajax = new XMLHttpRequest();

      ajax.open("get", modelInfo.url);
      ajax.send();
      ajax.onreadystatechange = () => {
        // && ajax.responseText.substring(0, 9) == "<!DOCTYPE"
        if (ajax.readyState == 4 && ajax.status == 200) {
          modelInfo.model = new Blob([ajax.responseText]);
          let db = this.DBs.get(dataBaseName);

          let indexedTable = db
            .transaction([tableName], "readwrite") //新建事务，readwrite, readonly(默认), versionchange
            .objectStore(tableName); //拿到IDBObjectStore 对象

          console.log("insetModel", modelInfo);

          var request1 = indexedTable.add(modelInfo);
          request1.onsuccess = (event) => {
            console.log("数据写入成功", event);

            // try {
            let dataRequest2 = indexedTable.index("id").get(modelInfo.id);
            dataRequest2.onsuccess = (e2) => {
              //@ts-ignore
              let url = URL.createObjectURL(e2.target.result.model);
              //@ts-ignore
              let modelSize = e2.target.result.modelSize;
              //@ts-ignore
              let scale = e2.target.result.scale;
              //@ts-ignore
              let type = e2.target.result.type;
              //@ts-ignore
              let loadType = e2.target.result.loadType;
              //@ts-ignore
              let name = e2.target.result.name;
              //@ts-ignore
              let position = e2.target.result.position;
              //@ts-ignore
              let rotation = e2.target.result.rotation;
              //@ts-ignore
              let userData = e2.target.result.userData;
              //@ts-ignore
              let modelName = e2.target.result.modelName;

              resolve({
                saved: true,
                name: name,
                modelName: modelName,
                url: url,
                modelSize: modelSize,
                type: type,
                loadType: loadType,
                scale: scale,
                position: position,
                rotation: rotation,
                userData: userData,
              });
            };
            // } catch (error) {
            //   console.warn("写入失败，请检查文件路径");
            //   resolve({ saved: false, url: undefined });
            // }
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
   * @description 删除模型
   * @author LL
   * @date 2022-07-15
   * @param {string} dataBaseName
   * @param {string} tableName
   * @param {number} id
   */
  public deleteModel(
    dataBaseName: string,
    tableName: string,
    id: number
  ): Promise<boolean> {
    let db = this.DBs.get(dataBaseName);

    return new Promise((resolve) => {
      let request = db
        .transaction([tableName], "readwrite") //新建事务，readwrite, readonly(默认), versionchange
        .objectStore(tableName) //拿到IDBObjectStore 对象、
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
   * @description 更新模型
   * @author LL
   * @date 2022-07-15
   * @param {string} dataBaseName
   * @param {string} tableName
   * @param {IDBParams} modelInfo
   */
  public updateModel(
    dataBaseName: string,
    tableName: string,
    modelInfo: IDBParams
  ) {
    this.deleteModel(dataBaseName, tableName, modelInfo.id);
    this.insertModel(dataBaseName, tableName, modelInfo);
  }
}
