import React from 'react';
import {TbChevronLeftPipe, TbChevronRightPipe} from "react-icons/tb";

const Menu = () => {
  return (
    <Spicetify.ReactComponent.Menu>
      <Spicetify.ReactComponent.MenuItem
        onClick={() => Spicetify.showNotification('Hello World')}
        leadingIcon={<TbChevronLeftPipe />}
      >
        <Spicetify.ReactComponent.TextComponent
          semanticColor="textBase"
          variant="viola"
          weight="book"
        >
          Trim Left
        </Spicetify.ReactComponent.TextComponent>
      </Spicetify.ReactComponent.MenuItem>
      <Spicetify.ReactComponent.MenuItem
        onClick={() => Spicetify.showNotification('Hello World')}
        leadingIcon={<TbChevronRightPipe />}
      >
        <Spicetify.ReactComponent.TextComponent
          semanticColor="textBase"
          variant="viola"
          weight="book"
        >
          Trim Right
        </Spicetify.ReactComponent.TextComponent>
      </Spicetify.ReactComponent.MenuItem>
    </Spicetify.ReactComponent.Menu>
  )
}

const PlaybackBarContextMenu = () => {
  return (
      <Spicetify.ReactComponent.RemoteConfigProvider
        configuration={Spicetify.Platform.RemoteConfiguration}
      >
        <Spicetify.ReactComponent.RightClickMenu
          menu={<Menu/>}
        >
          <div style={{width: "100%", height: "100%"}}></div>
        </Spicetify.ReactComponent.RightClickMenu>
      </Spicetify.ReactComponent.RemoteConfigProvider>
  );
};

export default PlaybackBarContextMenu;
