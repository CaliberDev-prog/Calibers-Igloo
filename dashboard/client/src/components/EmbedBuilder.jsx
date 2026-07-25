import { useState } from 'react';
import { X, Plus, Trash2, Palette } from 'lucide-react';

const EMPTY_FIELD = { name: '', value: '', inline: false };

function parseColor(hex) {
  if (!hex) return 0;
  return parseInt(hex.replace('#', ''), 16);
}

export default function EmbedBuilder({ onSend, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#75cff5');
  const [authorName, setAuthorName] = useState('');
  const [authorIcon, setAuthorIcon] = useState('');
  const [footerText, setFooterText] = useState('');
  const [image, setImage] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [fields, setFields] = useState([]);

  const updateField = (i, key, val) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  };

  const addField = () => {
    if (fields.length >= 25) return;
    setFields((prev) => [...prev, { ...EMPTY_FIELD }]);
  };

  const removeField = (i) => {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  };

  const buildEmbed = () => {
    const embed = {};
    if (title) embed.title = title;
    if (description) embed.description = description;
    if (color) embed.color = parseColor(color);
    if (authorName) embed.author = { name: authorName, ...(authorIcon ? { icon_url: authorIcon } : {}) };
    if (footerText) embed.footer = { text: footerText };
    if (image) embed.image = { url: image };
    if (thumbnail) embed.thumbnail = { url: thumbnail };
    const validFields = fields.filter((f) => f.name || f.value);
    if (validFields.length) embed.fields = validFields.map((f) => ({ name: f.name || '\u200b', value: f.value || '\u200b', inline: f.inline }));
    return embed;
  };

  const handleSend = () => {
    const embed = buildEmbed();
    if (!Object.keys(embed).length) return;
    onSend(embed);
  };

  const previewEmbed = buildEmbed();

  return (
    <div className="glass p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-200">Embed Builder</h3>
        <button onClick={onClose} className="text-dark-500 hover:text-dark-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Embed title"
            className="input-dark text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (supports markdown)"
            className="input-dark text-sm min-h-[100px] resize-y"
          />
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute left-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#75cff5"
                className="input-dark text-sm pl-20"
              />
            </div>
          </div>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Author name"
            className="input-dark text-sm"
          />
          <input
            type="text"
            value={authorIcon}
            onChange={(e) => setAuthorIcon(e.target.value)}
            placeholder="Author icon URL"
            className="input-dark text-sm"
          />
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Footer text"
            className="input-dark text-sm"
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Image URL"
              className="input-dark text-sm flex-1"
            />
            <input
              type="text"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="Thumbnail URL"
              className="input-dark text-sm flex-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-400">Fields ({fields.length}/25)</span>
              <button onClick={addField} className="text-xs text-ice-300 hover:text-ice-200 flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>
            {fields.map((f, i) => (
              <div key={i} className="bg-dark-900/50 rounded-xl p-3 space-y-2 border border-dark-700/30">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => updateField(i, 'name', e.target.value)}
                    placeholder="Field name"
                    className="input-dark text-xs flex-1"
                  />
                  <button onClick={() => removeField(i)} className="text-dark-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={f.value}
                  onChange={(e) => updateField(i, 'value', e.target.value)}
                  placeholder="Field value"
                  className="input-dark text-xs min-h-[60px] resize-y"
                />
                <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.inline}
                    onChange={(e) => updateField(i, 'inline', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-900 text-ice-300 focus:ring-ice-300/20"
                  />
                  Inline
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-dark-400">Preview</span>
          {Object.keys(previewEmbed).length > 0 ? (
            <div className="rounded-xl overflow-hidden border-l-4 border-ice-300 bg-dark-900/60 p-4 space-y-2">
              {previewEmbed.author && (
                <div className="flex items-center gap-2">
                  {previewEmbed.author.icon_url && (
                    <img src={previewEmbed.author.icon_url} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-xs font-semibold text-dark-200">{previewEmbed.author.name}</span>
                </div>
              )}
              {previewEmbed.title && <p className="text-sm font-bold text-dark-100">{previewEmbed.title}</p>}
              {previewEmbed.description && <p className="text-xs text-dark-300 whitespace-pre-wrap">{previewEmbed.description}</p>}
              {previewEmbed.fields && (
                <div className="grid grid-cols-2 gap-2">
                  {previewEmbed.fields.map((f, i) => (
                    <div key={i} className={f.inline ? '' : 'col-span-2'}>
                      <p className="text-xs font-bold text-dark-200">{f.name}</p>
                      <p className="text-xs text-dark-400">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {previewEmbed.thumbnail && (
                <img src={previewEmbed.thumbnail.url} alt="" className="w-16 h-16 rounded-lg object-cover float-right" />
              )}
              {previewEmbed.image && (
                <img src={previewEmbed.image.url} alt="" className="w-full rounded-lg mt-2" />
              )}
              {previewEmbed.footer && <p className="text-xs text-dark-500 pt-1">{previewEmbed.footer.text}</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-dark-700/50 p-8 text-center text-dark-500 text-xs">
              Fill in fields to preview
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSend} className="btn-primary text-sm">Send Embed</button>
      </div>
    </div>
  );
}
