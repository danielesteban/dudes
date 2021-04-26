import { EventDispatcher } from '../vendor/three.js';

const { location } = document;
const { history } = window;

class Router extends EventDispatcher {
  constructor() {
    super();
    window.addEventListener('popstate', this.update.bind(this));
  }

  push(path) {
    if (location.pathname !== path) {
      history.pushState({}, '', path);
      this.update();
    }
  }

  replace(path) {
    if (location.pathname !== path) {
      history.replaceState({}, '', path);
      this.update();
    }
  }

  update() {
    const [route, ...params] = location.pathname.substr(1).split('/').map((value) => (
      decodeURIComponent(value.trim())
    ));
    this.dispatchEvent({
      type: 'update',
      route,
      params,
    });
  }
}

export default Router;
