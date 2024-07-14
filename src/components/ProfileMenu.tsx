import {TrackTrim} from "../app";

const registerProfileMenu = () => {
  const importItem = new Spicetify.Menu.Item("Import", false, () => {
    TrackTrim.importTrims()
  })

  const exportItem = new Spicetify.Menu.Item("Export", false, () => {
    TrackTrim.exportTrims()
  })

  const menu = new Spicetify.Menu.SubMenu("Track Trim", [exportItem, importItem])
  menu.register()
}

export default registerProfileMenu
