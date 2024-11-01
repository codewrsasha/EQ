'use strict';

var range = {
  adjust(target, e) {
    const hor = target.getAttribute('type') === 'horizontal';
    if (e.type === 'mousemove') {
      target.movement = hor ? e.movementX : e.movementY;
    }
    else {
      target.offset = hor ? e.offsetX : e.offsetY;
    }
  },
  prepare() {
    return [...document.querySelectorAll('.range')].map(e => {
      const hor = e.getAttribute('type') === 'horizontal';
      const shadow = e.attachShadow({mode: 'closed'});

      const div = document.createElement('div');
      let value = 50;
      Object.defineProperty(e, 'value', {
        get() {
          return value;
        },
        set(v) {
          v = Math.max(0, Math.min(100, v));
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          const val = v * max / 100;
          if (hor) {
            e.style.setProperty('--left', `${val - 12}px`);
          }
          else {
            e.style.setProperty('--top', `${val - 12}px`);
          }
          value = v;
        }
      });
      Object.defineProperty(e, 'movement', {
        set(movement) {
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          const top = e.value * max / 100 + movement;
          e.value = top / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      Object.defineProperty(e, 'offset', {
        set(offset) {
          const max = e.getBoundingClientRect()[hor ? 'width' : 'height'];
          e.value = offset / max * 100;
          e.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });
      e.textContent = '';
      shadow.appendChild(div);


      const style = document.createElement('style');
      style.textContent = `
        :host {
          ${hor ? 'width: var(--width, 120px)' : 'height: var(--height, 120px)'};
          ${hor ? 'height: 12px' : 'width: 12px'};
          ${hor ? '--left: calc(50% - 12px)' : '--top: calc(50% - 12px)'};
          user-select: none;
          margin-left: 8px;
          cursor: grab;
          display: inline-block;
        }
        :host>div {
          pointer-events: none;
          ${hor ? 'height: 4px' : 'width: 4px'};
          ${hor ? 'width: 100%' : 'height: 100%'};
          background-color: #cccbca;
          position: relative;
          border-radius: 2px;
        }
        :host>div::after {
          content: '';
          position: absolute;
          ${hor ? 'top: -6px' : 'left: -6px'};
          ${hor ? 'left: var(--left)' : 'top: var(--top)'};
          background: radial-gradient(circle, #0aa39c, #0aa39c);
          background-size: 100%;
          background-position: center center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 0 4px #00615c;
          transition: transform 0.3s ease;
        }
      `;
      shadow.appendChild(style);

      return e;
    });
  }
};

document.addEventListener('mousedown', e => {
  const parent = e.target.closest('.range');
  if (parent) {
    range.adjust(parent, e);
    //
    const adjust = range.adjust.bind(null, parent);
    document.addEventListener('mousemove', adjust);
    const observe = () => {
      document.removeEventListener('mousemove', adjust);
      document.removeEventListener('mouseup', observe);
    };
    document.addEventListener('mouseup', observe);
  }
});
