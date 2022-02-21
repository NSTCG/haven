//components by tcg (for reference)
//disables collision component of object onto which the component is added
WL.registerComponent(
  "collision_disable",
  {
    active: { type: WL.Type.Bool, default: true },
  },
  {
    start: function () {
      this.object.getComponent("collision").active = false;
      WL.onXRSessionStart.push(this.change.bind(this));
    },
    change: function () {
      this.object.getComponent("collision").active = true;
    },
  }
);
