import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

interface controlInfo {}

export class TGUI{
  panel: any;

  public init() {}
  public initControls(controlInfo: controlInfo) {
    this.panel = new GUI();

    let menu = {
      minScale: 10,
      maxScale: 20,
      rotate: true,
      select: "10",
      clear: function () {
        console.log("点击");
      },
    };

    let rule = {
      minScale: {
        type: "number",
        min: 0,
        max: 15,
        onchange: function (e) {
          console.log(e);
        },
      },
      maxScale: {
        type: "number",
        min: 20,
        max: 25,
        onchange: function (e) {
          console.log(e);
        },
      },
      rotate: {
        type: "status",
        onchange: function (e) {
          console.log(e);
        },
      },
      select: {
        type: "select",
        options: ["10", "20"],
        onchange: function (e) {
          console.log(e);
        },
      },
    };

    Object.keys(menu).forEach((key) => {
      if (key in rule) {
        switch (rule[key].type) {
          case "number":
            this.panel
              .add(menu, key, rule[key].min, rule[key].max)
              .onChange(rule[key].onchange);
            break;
          case "select":
            this.panel
              .add(menu, key, rule[key].options)
              .onChange(rule[key].onchange);
            break;
          default:
            this.panel.add(menu, key).onChange(rule[key].onchange);
            break;
        }
      } else {
        this.panel.add(menu, key);
      }
    });
    // menu.map((item) => {
    //   this.panel.add(menu, item.key).onChange(item.function);
    // });

    // let menu = [
    //   {
    //     type: "switch",
    //     options: {
    //       key: "sharedSkeleton",
    //       value: false,
    //     },
    //     function: (e) => {
    //       console.log(e);
    //     },
    //   },
    //   {
    //     type: "button",
    //     options: {
    //       key: "sharedSkeleton",
    //       value: false,
    //     },
    //     function: (e) => {
    //       console.log(e);
    //     },
    //   },
    //   {
    //     name: "Base",
    //     type: "single",
    //     options: {
    //       idle: { weight: 1 },
    //       walk: { weight: 0 },
    //       run: { weight: 0 },
    //     },
    //   },
    // ];

    // menu.forEach((item) => {
    //   switch (item.type) {
    //     case "single":
    //       this.panel.addFolder(item.name);
    //       this.initSingle(item);
    //       break;
    //     case "switch":
    //       this.initSwitch(item);
    //       break;
    //   }
    // });
  }

  public initSwitch(switchInfo: any) {
    let obj: any = {};
    obj[switchInfo.options.key] = switchInfo.options.value;
    this.panel.add(obj, switchInfo.options.key).onChange(switchInfo.function);
  }
  public initSingle(single) {
    let baseNames = Object.keys(single.options);
    let panelSettings = { "modify time scale": 1.0 };
    const crossFadeControls = [];

    for (let i = 0, l = baseNames.length; i !== l; ++i) {
      const name = baseNames[i];
      const settings = single.options[name];
      panelSettings[name] = function () {
        const currentSettings = single.options[baseNames[0]];
        const currentAction = currentSettings ? currentSettings.action : null;
        const action = settings ? settings.action : null;

        if (currentAction !== action) {
          this.prepareCrossFade(currentAction, action, 0.35);
        }
      };

      crossFadeControls.push(
        this.panel.children
          .filter((item) => item._title == single.name)[0]
          .add(panelSettings, name)
      );
    }
  }

  public prepareCrossFade(startAction, endAction, duration) {
    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    // if (currentBaseAction === "idle" || !startAction || !endAction) {
    //   executeCrossFade(startAction, endAction, duration);
    // } else {
    //   synchronizeCrossFade(startAction, endAction, duration);
    // }
    // // Update control colors
    // if (endAction) {
    //   const clip = endAction.getClip();
    //   currentBaseAction = clip.name;
    // } else {
    //   currentBaseAction = "None";
    // }
    // crossFadeControls.forEach(function (control) {
    //   const name = control.property;
    //   if (name === currentBaseAction) {
    //     control.setActive();
    //   } else {
    //     control.setInactive();
    //   }
    // });
  }
}
