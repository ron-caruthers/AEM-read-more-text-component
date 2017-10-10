import AEM from 'aem';

class Component extends AEM.Component {

    init() {
        this.initializeText();
        this.resizeWatch(400);
    }

    initializeText(resize) {

        let _this = this,
            element = _this.element;

        if (_this.props.truncateText) { // If we have truncated Text Component(s)

            // set default Read More value if none
            let read_more_txt = _this.props.readMoreTxt
                    ? _this.props.readMoreTxt
                    : 'Read more',
                read_less_txt = _this.props.readLessTxt
                    ? _this.props.readLessTxt
                    : 'Read less',
                el_charlimit = _this.props.charCount,
                el_text = element.innerText,
                remove_text = element.querySelector('.text-component'),
                remove_text_p = remove_text.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, blockquote'),
                margin = 10,
                new_height = remove_text.clientHeight + ((remove_text_p.length + 1) * margin);

            if (!resize) { // page load

                // Put the calculated height in a data-attribute
                element.setAttribute('data-new-ht', new_height);

                // Create a new div to contain everything (truncated and non-truncated)
                let transition_container = document.createElement('div');

                transition_container.classList.add('text-component__truncated-content');
                element.insertBefore(transition_container, element.firstChild); // insert it before the hidden elements

                // Create a p for the truncated text/html snippet
                let trunc_child = document.createElement('p'),
                    trunc_text = _this.truncateText(el_text, el_charlimit, read_more_txt);

                trunc_child.classList.add('text-component__truncated-text');
                trunc_child.innerHTML = trunc_text;
                transition_container.appendChild(trunc_child); // insert it in the .truncated-content div

                // attach click listener
                let toggleLink = element.querySelector('.toggle-text');
                toggleLink.addEventListener('click', _this.toggleOpen.bind(this));

                // The page author can add simple text which AEM renders as naked text.
                // Page author may also add text wrapped in block level HTML elements, heading, p, ul, ol, etc.
                // We'll have to account for both possibilities
                if (remove_text_p.length > 0) { // if there are HTML elements

                    // loop through all the elements that are to be truncated
                    _this.forEach(remove_text_p, function (index, item) {

                        // Put all the hidden elements inside the newly created .truncated-content div
                        transition_container.appendChild(item);

                        // add Read Less link to last element of each truncated component
                        if (index === (remove_text_p.length - 1)) {
                            item.innerHTML += _this.lengthenText('', read_less_txt);
                            element.querySelector('.read-less').addEventListener('click', _this.toggleClose.bind(_this));
                        }
                        // Hide truncated elements
                        item.style.display = 'none';
                    });

                } else { // no HTML elements, just some text. Need to wrap it in a p.

                    // Create a p for the truncated text/html snippet
                    let loner_container = document.createElement('div'),
                        loner_el = document.createElement('p'),
                        nakedStr = remove_text.innerHTML;

                    // Put the text into the p, put the p into the div
                    loner_el.innerHTML = nakedStr;
                    loner_container.appendChild(loner_el);
                    remove_text.innerHTML = loner_container.innerHTML;

                    // make the p a node
                    let pStr = remove_text.querySelector('p');

                    // Put the new p inside the newly created .truncated-content div
                    transition_container.appendChild(pStr);

                    // add Read Less link to the end of the new p
                    pStr.innerHTML += _this.lengthenText('', read_less_txt);
                    element.querySelector('.read-less').addEventListener('click', _this.toggleClose.bind(_this));

                    // Hide the new p
                    pStr.style.display = 'none';
                }

                // Minimize min and max heights
                _this.changeHeights(transition_container, 20, 80);

            } else { // page resize

                let transition_container = element.querySelector('.text-component__truncated-content'),
                    truncated_content = transition_container.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, blockquote'),
                    expanded = transition_container.getAttribute('data-expanded');

                _this.forEach(truncated_content, function (index, item) {

                    if (expanded) { // if the content is visible

                        // measure the new height of .truncated-content since
                        // we're already at max height and display: block
                        new_height = transition_container.clientHeight + margin;

                        // set the .truncated-content maxHeight to 9999px during
                        // resize event, so content won't exceed element height
                        _this.changeHeights(transition_container, 80, 9999);

                    } else { // if only the truncated p is visible

                        // measure the new height of each contained element
                        if (index > 0) { // disregard the first element, it's the .truncated-text p
                            item.style.display = 'block'; // Can't get height of hidden elements
                            new_height += item.clientHeight + margin;
                            item.style.display = 'none'; // Hide it back
                        }
                    }

                });

                // Put the calculated height in a data-attribute
                element.setAttribute('data-new-ht', new_height);
            }
        }
    }

    toggleOpen(e) {

        let transition_container = this.getTransitionContainer(),
            truncated_elements = this.getTruncatedElements(),
            target_ht = this.getTargetHeight();

        // Show the hidden elements and hide .truncated-text
        this.forEach(truncated_elements, function (index, item) {
            item.style.display = (index === 0)
                ? 'none'
                : 'block';
        });

        // Create a data-attribute
        transition_container.setAttribute('data-expanded', true);
        // Update max-height from the data-attribute
        this.changeHeights(transition_container, 80, target_ht);

        e.preventDefault();
    }

    toggleClose(e) {

        let _this = this,
            transition_container = _this.getTransitionContainer(),
            truncated_elements = _this.getTruncatedElements();

        // Minimize heights
        _this.changeHeights(transition_container, 20, 80);
        // Update data-attribute
        transition_container.removeAttribute('data-expanded');

        // Don't hide the text until css transition is almost complete
        // Based on CSS transition time - 300ms
        setTimeout(function () {
            // Show .truncated-text and hide the other elements
            _this.forEach(truncated_elements, function (index, item) {
                item.style.display = (index === 0)
                    ? 'block'
                    : 'none';
            });
        }, 250);

        e.preventDefault();
    }

    getTransitionContainer() {
        return this.element.querySelector('.text-component__truncated-content');
    }

    getTruncatedElements() {
        return this.getTransitionContainer().querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, blockquote');
    }

    getTargetHeight() {
        return this.element.getAttribute('data-new-ht');
    }

    forEach(array, callback, scope) {
        for (var i = 0; i < array.length; i += 1) {
            callback.call(scope, i, array[i]); // pass back stuff we need
        }
    }

    truncateText(text, maxLength, readMoreTxt) {
        var shortText;
        if (text.length > maxLength) {
            shortText = text.split('').filter(function (item, index) {
                return (index < maxLength);
            });
        }
        return shortText.join('') + '&#8230;<a href="#" class="toggle-text read-more">' + readMoreTxt + '</a>';
    }

    lengthenText(text, readLessTxt) {
        return text += ' <a href="#" class="toggle-text read-less">' + readLessTxt + '</a>';
    }

    changeHeights(element, hMin, hMax) {
        element.style.minHeight = hMin + 'px';
        element.style.maxHeight = hMax + 'px';
    }

    resizeWatch(delay) {
        let _this = this,
            resizeTimeout = false, // Holder for timeout id
            resizeDelay = delay;

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(_this.initializeText(1), resizeDelay);
        });
    }
}

AEM.registerComponent('.component-text', Component);
