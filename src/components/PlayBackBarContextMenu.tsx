import React from 'react';
import {TbChevronLeftPipe, TbChevronRightPipe, TbTrash} from "react-icons/tb";
import {SpotifyTrim} from "../app";

const getCurrentSongID = () => {
  return Spicetify.Player.data.item.uid
}

const getSongDuration = () => {
  return Spicetify.Player.data.item.duration.milliseconds
}

const Menu = () => {
  return (
    <Spicetify.ReactComponent.Menu>
      <Spicetify.ReactComponent.MenuItem
        onClick={() => {
          SpotifyTrim.removeAllTrims(getCurrentSongID())
        }}
        leadingIcon={<TbTrash size={22} />}
      >
        <Spicetify.ReactComponent.TextComponent
          semanticColor="textBase"
          variant="viola"
          weight="book"
        >
          Remove All Trims
        </Spicetify.ReactComponent.TextComponent>
      </Spicetify.ReactComponent.MenuItem>
      <Spicetify.ReactComponent.MenuItem
        onClick={() => {
          const clickTimestamp = getSongDuration() * SpotifyTrim.getProgressFromX(SpotifyTrim.lastX)
          for (let trim of SpotifyTrim.getTrims(getCurrentSongID())) {
            if (trim.isTimestampWithinTrim(clickTimestamp)) {
              Spicetify.showNotification("Cannot add a new trim within an existing trim!", true)
              return
            }
          }
          const leftTimestamp = SpotifyTrim.getNextTimestampJump(getCurrentSongID(), clickTimestamp, getSongDuration(), "left")
          SpotifyTrim.newTrim(getCurrentSongID(), leftTimestamp, clickTimestamp)
          SpotifyTrim.renderTrims(getCurrentSongID())
        }}
        leadingIcon={<TbChevronLeftPipe size={20} />}
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
        onClick={() => {
          const clickTimestamp = getSongDuration() * SpotifyTrim.getProgressFromX(SpotifyTrim.lastX)
          for (let trim of SpotifyTrim.getTrims(getCurrentSongID())) {
            if (trim.isTimestampWithinTrim(clickTimestamp)) {
              Spicetify.showNotification("Cannot add a new trim within an existing trim!", true)
              return
            }
          }
          const rightTimestamp = SpotifyTrim.getNextTimestampJump(getCurrentSongID(), clickTimestamp, getSongDuration(), "right")
          SpotifyTrim.newTrim(getCurrentSongID(), clickTimestamp, rightTimestamp)
          SpotifyTrim.renderTrims(getCurrentSongID())
        }}
        leadingIcon={<TbChevronRightPipe size={20} />}
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

const PlayBackBarContextMenu = () => {

  return (
    <Spicetify.ReactComponent.RemoteConfigProvider
      configuration={Spicetify.Platform.RemoteConfiguration}
    >
      <Spicetify.ReactComponent.RightClickMenu
        menu={<Menu/>}
      >
        <div style={{width: "100%", height: "100%", position: "absolute", zIndex: "101"}}></div>
      </Spicetify.ReactComponent.RightClickMenu>
    </Spicetify.ReactComponent.RemoteConfigProvider>
  );
};

export default PlayBackBarContextMenu;
