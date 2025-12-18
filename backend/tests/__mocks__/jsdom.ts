// Mock JSDOM for testing
export class JSDOM {
  window: any;

  constructor(html: string = '') {
    // Create a minimal mock window object
    this.window = {
      document: {
        createElement: (tag: string) => ({
          tagName: tag,
          innerHTML: '',
          textContent: '',
        }),
      },
      Node: {},
      Element: {},
      HTMLElement: {},
      DocumentFragment: {},
    };
  }
}

export default JSDOM;
