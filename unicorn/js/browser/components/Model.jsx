// Copyright © 2015, Numenta, Inc.  Unless you have purchased from
// Numenta, Inc. a separate commercial license for this software code, the
// following terms and conditions apply:
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero Public License version 3 as published by the Free
// Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU Affero Public License for more details.
//
// You should have received a copy of the GNU Affero Public License along with
// this program.  If not, see http://www.gnu.org/licenses.
//
// http://numenta.org/licenses/

import connectToStores from 'fluxible-addons-react/connectToStores';
import path from 'path';
import React from 'react';
import remote from 'remote';

import Avatar from 'material-ui/lib/avatar';
import Card from 'material-ui/lib/card/card';
import CardActions from 'material-ui/lib/card/card-actions';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';
import Colors from 'material-ui/lib/styles/colors';
import Dialog from 'material-ui/lib/dialog';
import FlatButton from 'material-ui/lib/flat-button';
import IconCreate from 'material-ui/lib/svg-icons/content/add-circle-outline';
import IconDelete from 'material-ui/lib/svg-icons/action/delete';
import IconExport from 'material-ui/lib/svg-icons/file/file-download';
import IconInfo from 'material-ui/lib/svg-icons/action/info-outline';
import IconStop from 'material-ui/lib/svg-icons/av/stop';

import CreateModelAction from '../actions/CreateModel';
import DeleteModelAction from '../actions/DeleteModel';
import ExportModelResultsAction from '../actions/ExportModelResults';
import ModelData from '../components/ModelData';
import ModelStore from '../stores/ModelStore';
import ShowMetricDetailsAction from '../actions/ShowMetricDetails';
import StopModelAction from '../actions/StopModel';

const dialog = remote.require('dialog');

const DIALOG_STRINGS = {
  model: {
    title: 'Delete Model',
    message: 'Deleting this model will delete the associated model results.' +
              ' Are you sure you want to delete this model?'
  }
};


/**
 * Model component, contains Chart details, actions, and Chart Graph itself.
 */
@connectToStores([ModelStore], () => ({}))
export default class Model extends React.Component {

  static get contextTypes() {
    return {
      executeAction: React.PropTypes.func,
      getStore: React.PropTypes.func,
      muiTheme: React.PropTypes.object
    };
  }

  static get propTypes() {
    return {
      modelId: React.PropTypes.string.isRequired
    };
  }

  constructor(props, context) {
    super(props, context);

    let store = this.context.getStore(ModelStore);
    let model = store.getModel(this.props.modelId);

    this._style = {
      marginBottom: '1rem',
      width: '100%'
    };

    // init state
    this.state = Object.assign({
      confirmDialog: null
    }, model);
  }

  componentWillReceiveProps(nextProps) {
    let store = this.context.getStore(ModelStore);
    let model = store.getModel(nextProps.modelId);
    this.setState(Object.assign({}, model));
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.confirmDialog !== null) {
      this.refs.confirmDialog.show();
    } else if (prevState.confirmDialog !== null) {
      this.refs.confirmDialog.dismiss();
    }
  }

  /**
   * Opens a modal confirmation dialog
   * @param  {string}   title    Dialog title
   * @param  {string}   message  Dialog Message
   * @param  {Function} callback Function to be called on confirmation
   */
  _confirmDialog(title, message, callback) {
    this.setState({
      confirmDialog: {
        message, title, callback
      }
    });
  }

  _dismissDialog() {
    this.setState({
      confirmDialog: null
    });
  }

  _onStopButtonClick(modelId) {
    this.context.executeAction(StopModelAction, modelId);
  }

  _createModel(modelId, filename, timestampField, metric) {
    this.context.executeAction(CreateModelAction, {
      modelId, filename, metric, timestampField
    });
  }

  _deleteModel(modelId) {
    this._confirmDialog(
      DIALOG_STRINGS.model.title,
      DIALOG_STRINGS.model.message,
      () => {
        this.context.executeAction(DeleteModelAction, modelId);
        this._dismissDialog();
      }
    );
  }

  _exportModelResults(modelId) {
    dialog.showSaveDialog({
      title: 'Export Model Results',
      defaultPath: 'Untitled.csv'
    }, (filename) => {
      this.context.executeAction(ExportModelResultsAction, {modelId, filename});
    });
  }

  _showMetricDetails(modelId) {
    this.context.executeAction(ShowMetricDetailsAction, modelId);
  }

  render() {
    let avatar, title, titleColor;
    let model = this.state;
    let modelId = model.modelId;
    let filename = path.basename(model.filename);
    let confirmDialog = this.state.confirmDialog || {};
    let dialogActions = [
       {text: 'Cancel'},
       {text: 'Delete', onTouchTap: confirmDialog.callback, ref: 'submit'}
    ];
    let iconColor = this.context.muiTheme.rawTheme.palette.primary1Color;
    let buttonStyle = {color: iconColor};
    let iconStyle = {
      position: 'relative',
      left: '10px',
      top: '7px'
    };

    let actionList = [
      (<FlatButton
        label="Details"
        labelPosition="after"
        labelStyle={buttonStyle}
        onTouchTap={this._showMetricDetails.bind(this, modelId)}>
          <IconInfo color={iconColor} style={iconStyle} />
      </FlatButton>),
      (<FlatButton
        label="Stop"
        labelPosition="after"
        labelStyle={buttonStyle}
        onTouchTap={this._onStopButtonClick.bind(this, modelId)}>
          <IconStop color={iconColor} style={iconStyle} />
      </FlatButton>),
      (<FlatButton
        label="Create"
        labelPosition="after"
        labelStyle={buttonStyle}
        onTouchTap={
          this._createModel.bind(
            this, modelId, model.filename, model.metric, timestampField
          )
        }>
          <IconCreate color={iconColor} style={iconStyle} />
      </FlatButton>),
      (<FlatButton
        label="Delete"
        labelPosition="after"
        labelStyle={buttonStyle}
        onTouchTap={this._deleteModel.bind(this, modelId)}>
          <IconDelete color={iconColor} style={iconStyle} />
      </FlatButton>),
      (<FlatButton
        label="Export"
        labelPosition="after"
        labelStyle={buttonStyle}
        onTouchTap={this._exportModelResults.bind(this, modelId)}>
          <IconExport color={iconColor} style={iconStyle} />
      </FlatButton>)
    ];

    if (model.error) {
      avatar = (<Avatar backgroundColor={Colors.red500}>E</Avatar>);
      title = `${model.metric} | ${model.error.message}`;
      titleColor = Colors.red500;
    } else {
      avatar = (<Avatar backgroundColor={Colors.green500}></Avatar>);
      title = model.metric;
      titleColor = Colors.darkBlack;
    }

    return (
      <Card initiallyExpanded={true} style={this._style}>
        <CardHeader showExpandableButton={true}
          avatar={avatar}
          subtitle={filename}
          title={title}
          titleColor={titleColor}
          style={{paddingBottom:'1rem'}} />

        <CardText expandable={true}>
          <CardActions style={{textAlign:'right', marginRight:'2rem', marginTop:'-5rem'}}>
            {actionList.join()}
          </CardActions>
          <ModelData modelId={modelId} />
        </CardText>

        <Dialog title={confirmDialog.title}
          ref="confirmDialog"
          modal={true}
          actions={dialogActions}
          onDismiss={this._dismissDialog.bind(this)}
          actionFocus="submit">
            {confirmDialog.message}
        </Dialog>
      </Card>
    );
  }

}
