//components by tcg (for reference)
//turns on 360 degree device orientation for mobile ( based on global variable defined in index.html)
WL.registerComponent(
    "360-switch",
    {},
    {
      update: function () {
        if (window.view360 == true) {
          if (window.IsMobile == true) {
            this.object.getComponent("device-orientation-look").active = true;
          }
          if (window.IsMobile == false) {
            window.alert(
              "device orientation not supported (note that this feature is intended for mobile phones)"
            );
          }
        } else {
          this.object.getComponent("device-orientation-look").active = false;
        }
      },
    }
  );