import React from 'react';
import Canvas from "./Canvas";
import Trie from "./Trie";

import { isColor, isDash, divideByTokens } from "./Stuff";

import "./styles.css"
import "./button.css"

const placeholderText = [
  "   Draw trie\n" +
  "[opt] means optional\n\n" +
  "Nodes:\n" +
  "word [color]\n\n" +
  "Bonus:\n" +
  "[color]\nChanges all words below with this color\n",

  "   Draw graph\n" +
  "[opt] means optional\n\n" +
  "Nodes:\n" +
  "u [color]\n\n" +
  "Edges:\n" +
  "u v [weight] [color] [dash]\n\n" +
  "Bonus:\n" +
  "[color]\nChanges all nodes below with this color\n",
];

const defaultColorNode = "#c9a9ff";

class App extends React.Component {
  constructor() {
    super()

    this.state = {
      nodes: new Map(),
      edges: new Map(),
      drawGraph: true,
      directed: true,
      likeTree: false,
      drag: false
    }
  }

  getInput(e) {
    this.setState((prevState) => {
      const objects = e.target.value.split('\n').map((line) => {
        return divideByTokens(line);
      });

      let nodes = new Map();
      let edges = new Map();
      let currentNodeColor = defaultColorNode;

      function addNode(node, val) {
        if (!nodes.has(node)) {
          if (!val.hasOwnProperty("label")) {
            val.label = node;
          }
          if (!val.hasOwnProperty("color")) {
            val.color = currentNodeColor;
          }
        } else {
          const prev = nodes.get(node);
          if (!val.hasOwnProperty("label")) {
            val.label = prev.label;
          }
          if (!val.hasOwnProperty("color")) {
            // val.color = prev.color;
            val.color = currentNodeColor;
          }
        }
        nodes.set(node, val);
      }

      function addEdge(from, to, weight = "", color = "black", dashedLine = false) {
        // Adds the edges to a set to use them later
        if (!nodes.has(from))
          addNode(from, {});
        if (!nodes.has(to))
          addNode(to, {});

        if (!edges.has({ from, to })) {
          edges.set({ from, to }, { weight, color, dashedLine });
        } else {
          let val = edges.get({ from, to });
          if (weight.length > 0) {
            val.weight = weight;
          }
          if (color !== "black") {
            val.color = color;
          }
          if (dashedLine) {
            val.dashedLine = true;
          }
          edges.set({ from, to }, val);
        }
      }

      if (this.state.drawGraph === true) {
        // Add all the current objects of the graph
        for (let object of objects) {
          if (object.length === 0)
            continue;

          if (object.length === 1) {
            const x = object[0];
            if (isColor(x)) {
              // paint everything that's below with this color
              currentNodeColor = x;
            } else {
              // Single node
              const u = object[0];
              addNode(u, {});
            }
          } else if (object.length === 2) {
            const u = object[0];
            const x = object[1];
            if (isColor(x)) {
              // Node with color x
              addNode(u, { color: x });
            } else {
              // Edge u -> v (depends on the flag)
              const v = object[1];
              addEdge(u, v, "");
            }
          } else if (object.length >= 3) {
            const u = object[0];
            const v = object[1];

            // Edge u -> v with color | weight | dash

            let weight = "";
            let color = "black";
            let dashedLine = false;

            for (let i = 2; i < object.length; i++) {
              const x = object[i];

              if (isColor(x)) {
                color = x;
              } else if (isDash(x)) {
                dashedLine = true;
              } else {
                weight += x + " ";
              }
            }

            addEdge(u, v, weight, color, dashedLine);
          }
        }
      } else {
        // Draw trie D:
        const trie = new Trie(addNode, addEdge);
        currentNodeColor = "red";
        for (let object of objects) {
          if (object.length === 1) {
            if (isColor(object[0])) {
              // change the color of all below nodes
              currentNodeColor = object[0];
            } else {
              // insert a word with the currentNodeColor
              const word = object[0];
              trie.insert(word, currentNodeColor);
            }
          } else if (object.length === 2) {
            // insert a word with possibly a custom color
            const word = object[0];
            let color = currentNodeColor;
            if (object.length === 2 && isColor(object[1])) {
              color = object[1];
            }
            trie.insert(word, color);
          }
        }

        trie.dfs(trie.root, "*");
      }

      return {
        nodes: nodes,
        edges: edges,
      }
    });
  }

  toDrawButton(e) {
    this.setState((prev) => {
      return { drawGraph: !prev.drawGraph }
    });
  }

  directedEdges(e) {
    this.setState((prev) => {
      return { directed: !prev.directed }
    });
  }

  drawLikeTree(e) {
    this.setState((prevState) => {
      return { likeTree: !prevState.likeTree }
    });
  }

  dragAll(e) {
    this.setState((prevState) => {
      return { drag: !prevState.drag }
    });
  }

  render() {
    const textAreaValue = placeholderText[this.state.drawGraph ? 1 : 0];

    return (
      <div className="global-div">
        <div className="multi-button">
          <button onClick={this.toDrawButton.bind(this)}>
            {"Drawing a " + (this.state.drawGraph ? "graph" : "trie")}
          </button>

          <button onClick={this.drawLikeTree.bind(this)}>
            {this.state.likeTree ? "ordered as a tree" : "randomly ordered"}
          </button>

          <button onClick={this.directedEdges.bind(this)}>
            {this.state.directed ? "directed" : "un-directed"}
          </button>

          <button onClick={this.dragAll.bind(this)}>
            {"drag " + (this.state.drag ? "all" : "a single node")}
          </button>

          {/* New Center Button */}
          <button onClick={() => this.canvasRef?.resetView()}>
            Center
          </button>
        </div>

        <div className="image-wrapper">
          <textarea
            type="text"
            className="input"
            onChange={this.getInput.bind(this)}
            placeholder={textAreaValue} />

          <Canvas
            ref={(ref) => { this.canvasRef = ref; }}
            nodes={this.state.nodes}
            edges={Array.from(this.state.edges)}
            directed={this.state.directed}
            drawGraph={this.state.drawGraph}
            likeTree={this.state.likeTree}
            drag={this.state.drag} />
        </div>
      </div>
    );
  }
}

export default App;