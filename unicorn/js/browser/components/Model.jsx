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

import Card from 'material-ui/lib/card/card';
import CardActions from 'material-ui/lib/card/card-actions';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';
import Colors from 'material-ui/lib/styles/colors';
import Dialog from 'material-ui/lib/dialog';
import FlatButton from 'material-ui/lib/flat-button';

import DeleteModelAction from '../actions/DeleteModel';
import ExportModelResultsAction from '../actions/ExportModelResults';
import ModelData from '../components/ModelData';
import ModelStore from '../stores/ModelStore';
import FileStore from '../stores/FileStore';
import StopModelAction from '../actions/StopModel';
import CreateModelDialog from '../components/CreateModelDialog'
import ShowCreateModelDialogAction from '../actions/ShowCreateModelDialog';
import StartParamFinderAction from '../actions/StartParamFinder';
const MOMENTS_TO_DATETIME = require('../../config/momentjs_to_datetime_strptime.json');
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
@connectToStores([ModelStore, FileStore], (context) => ({
  files: context.getStore(FileStore).getFiles()
}))
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

    this._styles = {
      root: {
        marginBottom: '1rem',
        width: '100%'
      },
      title: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '13rem'
      },
      actions: {
        textAlign: 'right',
        marginRight: '2rem',
        marginTop: '-5rem'
      }
    };

    // init state
    this.state = Object.assign({
      deleteConfirmDialog: null
    }, model);
  }

  componentWillReceiveProps(nextProps) {
    let store = this.context.getStore(ModelStore);
    let model = store.getModel(nextProps.modelId);
    this.setState(Object.assign({}, model));
  }

  /**
   * Opens a modal confirmation dialog
   * @param  {string}   title    Dialog title
   * @param  {string}   message  Dialog Message
   * @param  {Function} callback Function to be called on confirmation
   */
  _showDeleteConfirmDialog(title, message, callback) {
    this.setState({
      deleteConfirmDialog: {callback, message, title}
    });
  }

  _dismissDeleteConfirmDialog() {
    this.setState({
      deleteConfirmDialog: null
    });
  }

  _onStopButtonClick(modelId) {
    this.context.executeAction(StopModelAction, modelId);
  }

  _createModel(metricName, csvPath, rowOffset, timestampIndex, valueIndex,
               datetimeFormat) {

    let inputOpts = {
      csv: csvPath,
      rowOffset: rowOffset,
      timestampIndex: timestampIndex,
      valueIndex: valueIndex,
      datetimeFormat: datetimeFormat
    };

    this.context.executeAction(ShowCreateModelDialogAction, {
      fileName: path.basename(csvPath),
      metricName: metricName
    });

    this.context.executeAction(StartParamFinderAction, {
      metricId: metricName,
      inputOpts: inputOpts
    })
  }

  _deleteModel(modelId) {
    this._showDeleteConfirmDialog(
      DIALOG_STRINGS.model.title,
      DIALOG_STRINGS.model.message,
      () => {
        this.context.executeAction(DeleteModelAction, modelId);
        this._dismissDeleteConfirmDialog();
      }
    );
  }

  _exportModelResults(modelId) {
    dialog.showSaveDialog({
      title: 'Export Model Results',
      defaultPath: 'Untitled.csv'
    }, (filename) => {
      if (filename) {
        this.context.executeAction(
          ExportModelResultsAction, {modelId, filename}
        );
      } else {
        // @TODO trigger error about "bad file"
      }
    });
  }

  render() {
    let titleColor, valueIndex, timestampIndex, metric;
    let model = this.state;
    let modelId = model.modelId;
    let filename = path.basename(model.filename);
    let title = model.metric;
    let isModelActive = (model && ('active' in model) && model.active);
    let hasModelRun = (model && ('ran' in model) && model.ran);
    let deleteConfirmDialog = this.state.deleteConfirmDialog || {};
    let dialogOpen = false;

    let file = this.props.files.find((file) => {
      return file.name === path.basename(this.state.filename);
    });
    let tsFormat = file.timestampFormat;

    let datetimeFormatCategory = MOMENTS_TO_DATETIME.find((category) => {
      return category.mappings[tsFormat];
    });
    let datetimeFormat = datetimeFormatCategory.mappings[tsFormat];

    for (let [index, value] of file.metrics.entries()) {
      if (value.type === 'date') {
        timestampIndex = index;
      }
      if (value.name === this.state.metric) {
        valueIndex = index;
        metric = value
      }
    }

    // TODO: we need to make sure metrics are being stored in the array in
    // the same order as the CSV file columns to get the actual indices.
    // For now we are assuming 2 columns CSV files with timestampIndex=0 and valueIndex=1
    timestampIndex = 0;
    valueIndex = 1;
    if (file.metrics.length > 2) {
      throw new Error('Only CSV files with 2 columns (timestamp, value) are allowed for now');
    }


    let csvPath = file.filename;
    let metricName = metric.name;
    let rowOffset = 1; // TODO; should be replaced by user define selection (check use first row as headers) at file upload time

    let dialogActions = [
      <FlatButton
        label="Cancel"
        onTouchTap={this._dismissDeleteConfirmDialog.bind(this)}
      />,
      <FlatButton
        keyboardFocused={true}
        label="Delete"
        onTouchTap={deleteConfirmDialog.callback}
        primary={true}
        ref="submit"
      />
    ];
    let actions = (
      <CardActions style={this._styles.actions}>
        <FlatButton
          disabled={hasModelRun}
          label="Create Model"
          labelPosition="after"
          onTouchTap={this._createModel.bind(this, metricName, csvPath, rowOffset, timestampIndex, valueIndex,
               datetimeFormat)}
        />
        <FlatButton
          disabled={!isModelActive}
          label="Stop Model"
          labelPosition="after"
          onTouchTap={this._onStopButtonClick.bind(this, modelId)}
        />
        <FlatButton
          disabled={!hasModelRun}
          label="Delete Model"
          labelPosition="after"
          onTouchTap={this._deleteModel.bind(this, modelId)}
        />
        <FlatButton
          disabled={!hasModelRun}
          label="Export Results"
          labelPosition="after"
          onTouchTap={this._exportModelResults.bind(this, modelId)}
        />
      </CardActions>
    );

    if (model.error) {
      titleColor = Colors.red400;
      title = `${model.metric} | ${model.error.message}`;
    }

    if (this.state.deleteConfirmDialog) {
      dialogOpen = true;
    }

    return (
      <Card initiallyExpanded={true} style={this._styles.root}>
        <CardHeader
          showExpandableButton={true}
          subtitle={<div style={this._styles.title}>{filename}</div>}
          title={<div style={this._styles.title}>{title}</div>}
          titleColor={titleColor}
        />
        <CardText expandable={true}>
          {actions}
          <ModelData modelId={modelId}/>
        </CardText>
        <Dialog
          actions={dialogActions}
          onRequestClose={this._dismissDeleteConfirmDialog.bind(this)}
          open={dialogOpen}
          ref="deleteConfirmDialog"
          title={deleteConfirmDialog.title}
        >
          {deleteConfirmDialog.message}
        </Dialog>
        <CreateModelDialog ref="createModelWindow" initialOpenState={false}/>
      </Card>
    );
  }

}
