// Copyright © 2015, Numenta, Inc. Unless you have purchased from
// Numenta, Inc. a separate commercial license for this software code, the
// following terms and conditions apply:
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero Public License version 3 as published by the
// Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU Affero Public License for more details.
//
// You should have received a copy of the GNU Affero Public License along with
// this program. If not, see http://www.gnu.org/licenses.
//
// http://numenta.org/licenses/

import path from 'path';
import React from 'react';
import FlatButton from 'material-ui/lib/flat-button';
import Dialog from 'material-ui/lib/dialog';
import CircularProgress from 'material-ui/lib/circular-progress';
import connectToStores from 'fluxible-addons-react/connectToStores';
import MetricStore from '../stores/MetricStore';
import HideCreateModelDialog from '../actions/HideCreateModelDialog';

@connectToStores([MetricStore], (context) => ({
  fileName: context.getStore(MetricStore).fileName,
  metricName: context.getStore(MetricStore).metricName,
  open: context.getStore(MetricStore).open,
  paramFinderResults: context.getStore(MetricStore).paramFinderResults
}))
export default class CreateModelDialog extends React.Component {

  static contextTypes = {
    executeAction: React.PropTypes.func
  };

  static propTypes = {
    initialOpenState: React.PropTypes.bool.isRequired
  };

  componentDidMount() {
    setTimeout(() => {
      // this.context.executeAction(UpdateParamFinderResults, PARAM_FINDER_OUTPUT)
    }, 5);
  }

  constructor(props, context) {
    super(props, context);
    this.state = Object.assign({}, this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.state = Object.assign({}, nextProps);
  }

  _resetState() {
    this.setState({
      open: false,
      fileName: null,
      metricName: null
    });

  }

  _onOK() {
    this.context.executeAction(HideCreateModelDialog);
    this._resetState()
  }

  _onNO() {
    this.context.executeAction(HideCreateModelDialog);
    this._resetState()
  }

  render() {
    let body = null;
    let actions = [];
    let title = `Create model for ${this.state.metricName}
    (${path.basename(this.state.fileName)})`;
    if (this.state.paramFinderResults.has(this.state.metricName)) {
      let paramFinderResults = this.state.paramFinderResults.get(
        this.state.metricName);

      body = `We determined that you will get the best results if we aggregate
      your data to ${paramFinderResults.aggInfo.windowSize} seconds intervals.`;
      actions.push(
        <FlatButton
          label="OK"
          onTouchTap={this._onOK.bind(this)}
        />);
      actions.push(
        <a href="#" onClick={this._onNO.bind(this)}>No, please use original
          data.</a>
      );
    } else {
      body = (
        <div>
          <CircularProgress size={0.5}/> Preparing to create an HTM model. This
          might take a few seconds.
        </div>)
    }
    return (
      <Dialog
        actions={actions}
        open={this.state.open}
        title={title}
      >
        {body}
      </Dialog>
    );
  }
}
