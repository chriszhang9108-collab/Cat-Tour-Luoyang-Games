import { App } from './app/App';
import './styles/global.css';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('找不到游戏挂载节点 #app。');
}

new App(root);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }, { once: true });
}
