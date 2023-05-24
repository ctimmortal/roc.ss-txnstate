interface IElementState {
  submit: HTMLButtonElement;
  clear: HTMLButtonElement;
  dialog: HTMLDialogElement;
  submitDialog: HTMLButtonElement;
  cancelDialog: HTMLButtonElement;
  refreshForm: HTMLInputElement;
}

interface ILocalTxnState {
  id: string;
  date?: Date | string | number;
  selectedIndex?: string;
  comments?: string;
  checked?: boolean;
}

interface ITxnState extends Omit<ILocalTxnState, 'selectedIndex'> {
  date: Date;
  selectedIndex: number;
  selectedValue: string;
  checked: boolean;
  comments: string;
  select: HTMLSelectElement;
  checkbox: HTMLInputElement;
  otherComments?: HTMLInputElement;
  hasOtherComments: boolean;
  stored: HTMLInputElement;
  validate: () => boolean;
  updateDomState: () => void;
  reset: () => void;
  remove: () => void;
  save: () => void;
  serialize: () => string;
}

const ELEMENT_STATE: IElementState = {
  submit: document.getElementById('txProcessedOutside') as HTMLButtonElement,
  clear: document.getElementById('clearButton') as HTMLButtonElement,
  dialog: document.getElementById(
    'confirmRejectedTransactionsSomeMore'
  ) as HTMLDialogElement,
  submitDialog: document.getElementById('dialogConfirmButton') as HTMLButtonElement,
  cancelDialog: document.getElementById('dialogCancelButton') as HTMLButtonElement,
  refreshForm: document.getElementById('refreshForm') as HTMLInputElement
};

class TxnState implements ITxnState {
  id: string;
  date: Date;

  constructor(state: ILocalTxnState) {
    this.id = state.id;
    const now = new Date();
    this.date = state.date === undefined ? now : new Date(state.date);
    if (this.date >= now) {
      if (state.selectedIndex === undefined) {
        this.selectedIndex = 0;
      } else {
        this.selectedIndex = Number.parseInt(state.selectedIndex, 10);
      }
      this.checked = state.checked || false;
    }
    this.updateDomState();
  }

  get select() {
    return document.getElementById(this.id + '.select') as HTMLSelectElement;
  }

  get checkbox() {
    return document.getElementById(this.id + '.checkbox') as HTMLInputElement;
  }

  get otherComments() {
    const e = document.getElementById(this.id + '.additionalComments');
    if (e) {
      return e as HTMLInputElement;
    }
  }

  get hasOtherComments() {
    return this.checked && this.selectedIndex === this.select.options.length - 1;
  }

  get stored() {
    console.log(`something touched the stored comment for ${this.id}`);
    return document.getElementById(this.id) as HTMLInputElement;
  }

  get selectedIndex() {
    return this.select.selectedIndex;
  }

  set selectedIndex(value: number) {
    try {
      this.select.selectedIndex = value;
    } catch {
      this.select.selectedIndex = 0;
    }
    this.updateDomState();
  }

  get selectedValue() {
    return this.select.options[this.select.selectedIndex].label;
  }

  get comments() {
    return this.stored.value;
  }

  set comments(value) {
    this.stored.value = value === undefined ? '' : value;
  }

  get checked() {
    return this.checkbox.checked;
  }

  set checked(value) {
    this.checkbox.checked = value;
    this.select.disabled = !value;
    if (!value) {
      this.select.selectedIndex = 0;
    }
    this.updateDomState();
  }

  updateDomState() {
    if (this.checked) {
      this.select.disabled = false;
      ELEMENT_STATE.clear.disabled = false;
      if (this.selectedIndex === 0) {
        ELEMENT_STATE.submit.disabled = true;
      } else {
        ELEMENT_STATE.submit.disabled = false;
      }
    } else {
      this.select.disabled = true;
      ELEMENT_STATE.submit.disabled = true;
    }
  }

  validate(): boolean {
    if (this.checked) {
      if (this.selectedIndex === 0) {
        return false;
      } else if (this.selectedIndex === this.select.options.length - 1) {
        if (this.otherComments!.value.trim().length <= 0) {
          return false;
        } else {
          this.comments = this.otherComments!.value;
        }
      } else if (
        this.selectedIndex < 0 ||
        this.selectedIndex >= this.select.options.length
      ) {
        let wtf = `how did you get ${this.selectedIndex}?`;
        let wtaf = 'wtaf?';
        let quit = 'quit fucking around';
        let dick = 'dick';
        console.log(wtf, wtaf, quit, dick);
        this.select.selectedIndex = 0;
        return false;
      } else {
        this.comments = this.selectedValue;
      }
    }
    return true;
  }

  reset() {
    this.date = new Date();
    this.checked = false;
    this.selectedIndex = 0;
    this.select.disabled = true;
    this.comments = '';
    if (this.otherComments) {
      this.otherComments.value = '';
    }
    this.save();
  }

  remove() {
    localStorage.removeItem(this.id);
  }

  save() {
    localStorage.setItem(this.id, this.serialize());
    console.log('saved state', this);
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      date: this.date.toISOString(),
      selectedIndex: this.selectedIndex,
      comments: this.comments
    });
  }

  updateDialogTable() {
    const table = document.getElementById(
      'rejectedTransactionsSummaryTableDialog'
    ) as HTMLTableElement;
  }
}

const ALL_STATE: TxnState[] = [];

window.addEventListener('load', () => {
  if (ALL_STATE.length > 0) {
    console.log('we just tried to re-hydrate ALL_STATE');
  } else if (localStorage.length > 0) {
    Object.keys(localStorage).forEach((e) => {
      try {
        const obj = localStorage.getItem(e);
        if (obj === null) throw new Error();

        var dehydrated = JSON.parse(obj) as Partial<ILocalTxnState>;
        if (!dehydrated || !dehydrated.id || !document.getElementById(dehydrated.id)) {
          throw new Error();
        }

        ALL_STATE.push(new TxnState(dehydrated as ILocalTxnState));
      } catch {}
    });
  }

  const modalDiv = document.getElementById('theModalGoesHere');
  if (modalDiv) {
    modalDiv.innerHTML = `<dialog id="confirmRejectedTransactionsSomeMore">
    <form method="dialog" id="dialogForm">
      <table id="dialogTable" role="presentation" class="tbborder">
        <tr class="tableRowWithDarkBlueBgd" style="font-size: 20; font-weight: bold;">
          <td colspan="2">Rejected Transaction(s) - Enter Comments</td>
        </tr>
        <tr class="tableRowWithDarkBlueBgdAndBorder" style="font-weight: bold;">
          <td colspan="2">Transaction(s)</td>
        </tr>
        <tr>
          <td class="transactionGroupTitle" id="input-instructions">
            If "Other Reason" was selected, please enter the reason in the text box.
          </td>
        </tr>
  
        <tr>
          <td>
            <table id="rejectedTransactionsSummaryTableDialog" role="presentation" class="tbborder" style="border-left: 1px; border-right: 1px;">
  
              <tr class="tableRowWithBlueBgd">
                <th>Transaction</th>
                <th>Reason for Termination</th>
              </tr>
  
            <c:forEach var="transaction" items="${
              form.selectedTransactions
            }" varStatus="status">
              <tr class="tableRowWithGrayBgdAndBorder">
                <td>${transaction.functionDesc}</td>
                <td>
                  <c:choose>
                    <c:when test="${transaction.comments == 'Other reason'}">
                      <input type="text" class="textField" title="Reason for termination" id="${
                        transaction.transactionId
                      }.additionalComments">
                    </c:when>
                    <c:otherwise>${transaction.comments}</c:otherwise>
                  </c:choose>
                </td>
              </tr>
            </c:forEach>
            </table>
  
            <div id="dialog-button-container">
              <html:submit property="activityPathsSummaryMethod" styleClass="buttonLabelBold" styleId="dialogConfirmButton">
                <bean:message key="button.continueToNextStep" />
              </html:submit>
              <button type="cancel" class="buttonLabelBold" id="dialogCancelButton">
                <bean:message key="button.cancel" />
              </button>
            </div>
  
          </td>
        </tr>
      </table>
    </form>
  </dialog>`;
  }
});

// make the 'click' event of the main form's submit button ONLY open the dialog
ELEMENT_STATE.submit.addEventListener('click', (event) => {
  event.preventDefault();
  ELEMENT_STATE.refreshForm.value = 'Y';
  document.forms[0].submit();
  ELEMENT_STATE.dialog.show();
});

// clear button resets all inputs and disables clear and submit buttons
ELEMENT_STATE.clear.addEventListener('click', (event) => {
  event.preventDefault();
  ALL_STATE.forEach((s) => s.reset());
  ELEMENT_STATE.submit.disabled = true;
  ELEMENT_STATE.clear.disabled = true;
});

// if the dialog is created, add button click handlers
if (ELEMENT_STATE.dialog !== null) {
  // dialog's submit button actually submits the page's main form
  ELEMENT_STATE.submitDialog.addEventListener('click', (event) => {
    event.preventDefault();
    document.forms[0].submit();
  });

  // dialog's cancel button just closes the dialog
  ELEMENT_STATE.cancelDialog.addEventListener('click', (event) => {
    event.preventDefault();
    ELEMENT_STATE.dialog.close();
  });
}
