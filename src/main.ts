import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config';

window.addEventListener('load', () => {
  new Phaser.Game(gameConfig);
});
