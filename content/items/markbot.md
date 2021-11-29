---
title: MarkBot
date: 2017-10-02
tags: ["python", "ML", "NLP"]
---
I've always had a love for large datasets and the interesting things one can do with them, so when my roommate sent me his entire Google Hangouts and Facebook chat history, I knew what I had to do.

# Enter MarkBot

## Goals

In the past, I've implemented plenty of basic character-level RNNs and trained them on all sorts of text corpora, but this time I wanted to try something different, and utilize word embeddings to try and produce a more coherent Mark-based chatbot. My thought process goes like so:

* Word embeddings will allow the network to learn more abstract concepts beyond basic spelling and grammar, as it will not have to essentially memorize the spelling of each word in the English language (or rather, Mark's unique interpretation of the English language)
* Word embeddings also have the advantage that similar words will lie close to each other in the vector space, so a conversational model will likely be more coherent, as it is predicting based on **meaning** rather than on **spelling**

## Libraries

I've used Python for the sake of brevity and ease of use, here are some of the libraries I've used:

* [tqdm](https://github.com/tqdm/tqdm) - A great progress-bar library for the tedious *for* loops one often encounters when dealing with large datasets
* [keras](https://github.com/fchollet/keras) - An easy-to-use deep learning tool that can sit on top of several of the most popular Python tensor mathematics libraries (I used Theano for my backend)
* [nltk](https://github.com/nltk/nltk) - A handy collection of NLP tools
* [python-glove](https://github.com/maciejkula/glove-python) - I have chosen GloVe over word2vec because of some slight and entirely unsubstantiated performance benefits I read about on the Internet somewhere<sup>[**citation needed**]</sup>

## The Project

### Parsing

In addition to Mark's Google Hangouts dump, I regularly back up my entire Facebook chat history, which I incorporated.

```python
print("Loading datasets")
with open("/home/will/Desktop/Python/Facebook.pkl","rb") as f: facebook = pickle.loads(f.read())
with open("/home/will/Desktop/mark_hangouts.json", "r") as f: hangouts = json.loads(f.read())

sentences = []

print("Parsing Facebook data")
mark_uid = '1750122188'
for t, ms in tqdm(facebook["messages"].items()):
    ms = ms[::-1]
    for idx, m in enumerate(ms):
        if not m.text:
            continue
        text = m.text
        if not text:
            continue
        is_mark = m.author == mark_uid
        sentences.append((text, is_mark))

print("Parsing Hangouts data")
mark_chatid = "116404337397755400265"
for t in tqdm(hangouts["conversation_state"]):
    ms = t["conversation_state"]["event"]
    for idx, m in enumerate(ms):
        if "chat_message" not in m or "segment" not in m["chat_message"]["message_content"]:
            continue
        text = "\n".join(segment["text"] for segment in m["chat_message"]["message_content"]["segment"] if "text" in segment)
        if not text:
            continue
        is_mark = m["sender_id"]["chat_id"] == mark_chatid
        sentences.append((text, is_mark))
print("Loaded", len(sentences), "sentences")
del facebook, hangouts
```

TL;DR: Parsing Google Hangouts JSON is a pain and a half. Also, I tend to throw PEP out the window when it comes to single-use projects like this.

What this code does:

* Combines subsequent messages from one user into a single message
* Prepares a list of sentences with both text data and an *is_mark* boolean, which is fairly self-explanatory. This allows us to build (question, response) tuples later
* Delete references to things we don't need after the fact

<b></b>

    >> sentences
    [
     ("Hey mark what's up?", False),
     ("Not much, how about you?", True),
     ...
    ]


### Tokenizing

Now let's separate messages into their constituent words, or *tokens*

```python
print("Tokenizing messages")
import collections
import nltk

sentences = [(s[0].lower(), s[1]) for s in sentences]
vocab = collections.defaultdict(lambda: 0)
for idx, s in enumerate(tqdm(sentences)):
    words = nltk.word_tokenize(s[0])
    sentences[idx] = (words, s[1])
    for w in words:
        vocab[w] += 1
vocab = dict(vocab)
print("{} unfiltered vocabulary words".format(len(vocab)))
```

What this code does:

* Lower-cases and tokenizes all the messages
* Counts word frequencies

By lower-casing the messages, we reduce the vocabulary size, as otherwise "Car" and "car" would be interpreted as different words

<b></b>

    >> sentences
    [
     (["hey", "mark", "what", "'s", "up", "?"], False),
     (["not", "much", ",", "how", "about", "you", "?"], True),
     ...
    ]

### Query, Response

Now I need to form (query, response) tuples if this is going to work as a conversational model. This is when we'll use the *is_mark* bool.

```python
print("Assembling response training data")
import random

BOS, EOS = "\x00", "\x01"
exchanges = []
idxs = [idx for idx, s in enumerate(sentences) if s[1] and idx >= CONTEXT_LINES]
sentences = [s[0] for s in sentences]
#Also perform pruning to remove query/response pairs with uncommon words
prune = set([w for w in vocab if vocab[w] < 9])
for idx in idxs:
    exchange = [s for s in sentences[idx-CONTEXT_LINES: idx+1]]
    exchange[-1] = [BOS] + exchange[-1] + [EOS]
    if any([w in prune for s in exchange for w in s]):
        continue
    else:
        exchanges.append(exchange)
sentences = [s for e in exchanges for s in e]
exchanges = [([w for s in e[:-1] for w in s], e[-1]) for e in exchanges]
random.shuffle(exchanges)

#Now recompute our vocabulary
vocab = collections.defaultdict(lambda: 0)
for s in sentences:
    for w in s:
        vocab[w] += 1
vocab = dict(vocab)
print("{} query/response pairs\n{} vocabulary words".format(len(exchanges), len(vocab)-2))
```

A few things are happening here:

* (query, response) tuples, or **exchanges**, are prepared
* Exchanges with uncommon vocabulary are discarded. In this dataset, uncommon vocabulary mostly manifests in the form of esoteric emoji, which I don't particularly need this conversational model to reproduce.
<br>
Like I said, this data merely represents Mark's unique subset of the English language (or rather, the two sets intersect but also contain elements unique to themselves, as I do not believe '😍' is in the OED, nor have I ever heard Mark say 'lexiphanicism', though he is certainly prone to it)
* Beginning-of-sequence and end-of-sequence markers are inserted into the response element, for use later in the neural chatbot model
* Finally, the vocabulary is recomputed to account for the removal of exchanges containing uncommon vocabulary. I could have simply replaced these uncommon words with an unknown-word token, but thought it would be cleaner to not go that route.

This is what the data looks like now:

    >> exchanges
    [
     (
      ["hey", "mark", "what", "'s", "up", "?"],
      ["\x00", "not", "much", ",", "how", "about", "you", "?", "\x01"]
     ),
     ...
    ]

### Converting to Indices

Now let's turn these words into numbers!

```python
#The lower a word's lookup index, the higher its frequency in the corpus
import keras
from keras.preprocessing.sequence import pad_sequences
lookup_table =      {idx: w for idx, w in enumerate(sorted(vocab, key=lambda w: vocab[w])[::-1])}
lookup_table.update({w: idx for idx, w in enumerate(sorted(vocab, key=lambda w: vocab[w])[::-1])})
X = np.asarray([[lookup_table[w] for w in query] for query in (r[0] for r in exchanges)])
Y = np.asarray([[lookup_table[w] for w in response] for response in (r[1] for r in exchanges)])
X = pad_sequences(X, SEQUENCE_LEN)
Y = pad_sequences(Y, SEQUENCE_LEN, padding="post")
```

* Firstly, the lookup table simply maps words to their indexes and back again
* The X and Y variables now contain the query, response data but in index format, and padded to length

    ```
    >> X 
    array([
           [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0, 262,  73,  28,  19,  44,   4
           ],
           ...
          ], dtype=int32 )

    >> Y
    array([
           [  1,  31, 107,  10,  54,  76,   9,   4,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
              0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0
           ],
           ...
          ], dtype=int32 )
    ```

We are still dealing with words here though, the integers in X and Y do not encode any meaning. That comes next.

As you can see, queries are padded at the **beginning** and responses are padded at the **end**, so you can see that we're going to be feeding it a certain amount of context and expecting some variable amount of response, stopping when we hit the 0's (which represent end-of-sequence markers)

### Vectorization

The fun begins! Now we are going to train with the GloVe algorithm to embed our words into a high dimensional space that encodes semantic content and relationships.

```python
print("Building vocabulary model")
import glove
import multiprocessing

corpus = glove.Corpus()
corpus.fit(sentences, window=10)
glove_model = glove.Glove(no_components=WORD_EMBEDDING_COMPONENTS, learning_rate=0.05)
glove_model.fit(corpus.matrix, epochs=30, no_threads=multiprocessing.cpu_count(), verbose=True)
del sentences    
```

The model has now been trained on the available sentences and we can do useful things with the resulting word embeddings! But we're not going to. Instead we're going to virtualize my roommate.

### Building the neural model

We're into the thick of it now. I have adapted a model I found [here](https://github.com/oswaldoludwig/Seq2seq-Chatbot-for-Keras) that implements a sequence-to-sequence architecture.

```python
print("Building neural chatbot model")
optimizer = keras.optimizers.Adam(lr=0.001) 
input_context = keras.layers.Input(shape=(SEQUENCE_LEN,), dtype='int32', name='input_context')
inputanswer_chunkanswer = keras.layers.Input(shape=(SEQUENCE_LEN,), dtype='int32', name='inputanswer_chunkanswer')
LSTM_encoder = keras.layers.LSTM(SENTENCE_EMBEDDING_SIZE, kernel_initializer='lecun_uniform')
LSTM_decoder = keras.layers.LSTM(SENTENCE_EMBEDDING_SIZE, kernel_initializer='lecun_uniform')
Shared_Embedding = keras.layers.Embedding(output_dim=glove_model.no_components, input_dim=len(vocab), weights=[glove_model.word_vectors.copy()], input_length=SEQUENCE_LEN)
word_embedding_context = Shared_Embedding(input_context)
context_embedding = LSTM_encoder(word_embedding_context)
word_embeddinganswer_chunknswer = Shared_Embedding(inputanswer_chunkanswer)
answer_embedding = LSTM_decoder(word_embeddinganswer_chunknswer)
merge_layer = keras.layers.concatenate([context_embedding, answer_embedding], axis=1)
#We can change the number of neurons in this Dense layer
out = keras.layers.Dense(len(vocab)//2, activation="relu")(merge_layer)
out = keras.layers.Dense(len(vocab), activation="softmax")(out)
keras_model = keras.models.Model(inputs=[input_context, inputanswer_chunkanswer], outputs=[out])
keras_model.compile(loss='categorical_crossentropy', optimizer=optimizer)
del glove_model
```

This graphic gives the general idea - we're feeding in both the query and the response so far into the network to get the next word in the response

![alt text](https://raw.githubusercontent.com/oswaldoludwig/Seq2seq-Chatbot-for-Keras/master/model_graph.png "[again, not mine]")

At this point, a word looks like this:

    array([ 0.06541251, -0.60211362,  0.19668873,  0.29943736, -0.04908019,
           -0.25159775, -0.48105127,  0.18929953, -0.35931338,  0.21183521,
            0.32535496,  0.24972419,  0.09867496,  0.28443115,  0.50898685,
           -0.04326349,  0.10213821, -0.14590992,  0.33488042, -0.14846319,
           -0.1409087 , -0.19627512,  0.27064866,  0.30814872,  0.44088078,
           -0.39964452,  0.2399658 , -0.13583342,  0.02606956,  0.30684316,
           -0.12864215,  0.10482805,  0.28297046,  0.07438818, -0.29477953,
            0.10404356, -0.32852114, -0.09728817, -0.20320519,  0.18048016,
            0.37241584,  0.15531563,  0.16767227, -0.02549689,  0.24815189,
           -0.11939143, -0.29207007,  0.26256024,  0.41336682,  0.23037289,
           -0.23548023, -0.16578295,  0.00896039,  0.20869134, -0.14342295,
           -0.23251574,  0.40983124,  0.19986974,  0.16265753, -0.18266805,
           -0.1975813 , -0.33908948,  0.18949206, -0.11479648,  0.35812903,
           -0.16103889,  0.14967493,  0.30761199,  0.31005254, -0.04312443,
           -0.04538435, -0.21032511, -0.18207666, -0.27363791, -0.00809431,
           -0.16818864, -0.12332384, -0.2938934 , -0.2526425 , -0.23394612,
            0.53925823,  0.31640659,  0.62309644,  0.28594853, -0.39425204,
           -0.1976824 , -0.14072738, -0.51376977,  0.18433504, -0.04015992,
            0.26220768, -0.13670408,  0.15177998,  0.27146796,  0.03903609,
           -0.06253815,  0.42974848,  0.30019652, -0.05678444,  0.18900654])

### Training the neural model

We have to do a lot of chunking here because the size of the arrays we're creating is so large that I keep running out of RAM

```python
chunk_size = X.shape[0] // NUM_CHUNKS
for epoch in range(EPOCHS):
    print("Training epoch {}/{}".format(epoch+1, EPOCHS))
    try:
        for chunk_idx, chunk in enumerate(range(0, len(X), chunk_size)):
            print("Training chunk {}".format(chunk_idx+1))
            X_chunk = X[chunk: chunk+chunk_size]
            Y_chunk = Y[chunk: chunk+chunk_size]

            total_unpadded_len = 0
            for i, y in enumerate(Y_chunk):
                unpadded_len = np.where(y == lookup_table[EOS])[0][0]
                total_unpadded_len += unpadded_len + 1

            context_chunk = np.zeros((total_unpadded_len, SEQUENCE_LEN))
            answer_chunk = np.zeros((total_unpadded_len, SEQUENCE_LEN))
            next_word_chunk = np.zeros((total_unpadded_len, len(vocab)))

            count = 0
            for i, y in enumerate(Y_chunk):
                #Prepare one-hot encoding
                answer_partial = np.zeros((1, SEQUENCE_LEN))
                limit = np.where(y == lookup_table[EOS])[0][0]

                for symbol_idx in range(1, limit+1):
                    one_hot = np.zeros((1, len(vocab)))
                    one_hot[0, y[symbol_idx]] = 1

                    answer_partial[0, -symbol_idx:] = y[0: symbol_idx]

                    context_chunk[count, :] = X_chunk[i: i+1]
                    answer_chunk[count, :] = answer_partial
                    next_word_chunk[count, :] = one_hot
                    count += 1

            keras_model.fit([context_chunk, answer_chunk], next_word_chunk, batch_size=BATCH_SIZE, epochs=1)
            del context_chunk, answer_chunk, next_word_chunk

    except KeyboardInterrupt:
        break
```

This code is training the neural network bit by bit so it learns how to converse, given a query and a partial answer.

For example, given the vector arrays for the query string "what is your name" and partial answer string "my name is", it would output a vector that is very close to the vector for the word "mark" (assuming Mark has answered this question often enough for it to learn that response)

Now all we have to do is test it!

### Testing the chatbot!

```python
print("Testing chatbot")
#Helper function to sample an index from an array of probabilities
def sample(preds, temperature=1.0):
    preds = np.asarray(preds).astype('float64')
    preds = np.log(preds) / temperature
    exp_preds = np.exp(preds)
    preds = exp_preds / np.sum(exp_preds)
    probas = np.random.multinomial(1, preds, 1)
    return np.argmax(probas)

def ask(query, temperature=0.3):
    print(query)
    query = np.asarray([lookup_table[w] for w in nltk.word_tokenize(query.lower())])
    #Pad to length of query sentence
    query = np.pad(query[-SEQUENCE_LEN:], pad_width=(SEQUENCE_LEN-len(query), 0), mode="constant")
    query = np.asarray([query])

    response = np.zeros((1, SEQUENCE_LEN))
    #Insert BOS marker
    response[0, -1] = lookup_table[BOS]
    for k in range(SEQUENCE_LEN - 1):
        pred = keras_model.predict([query, response])[0]
        next_token = sample(pred, temperature)
        #Shift partial answer over one
        response[0, :-1] = response[0, 1:]
        response[0, -1] = next_token
        #Is the model telling us to end the sentence?
        if next_token == lookup_table[EOS]:
            break

    response = " ".join([lookup_table[int(token)] for token in response[0] if token not in (lookup_table[BOS], lookup_table[EOS])])
    print(response)

ask("What is the meaning of life?")
```

The sample function allows us to introduce some uncertainty into the reply, so it's not the same every time.

And the response, after the default 10 epochs of training?

    >> ask("What is the meaning of life?")
    i do n't know what i 'm doing

Overfitting aside, that sure sounds like Mark.

*YMMV*
